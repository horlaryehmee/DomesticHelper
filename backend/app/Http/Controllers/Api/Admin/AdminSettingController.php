<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogService;
use App\Services\GoogleOAuthConfiguration;
use App\Services\PlatformFeatures;
use App\Services\SmtpConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AdminSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Setting::query()->where('group', '!=', 'mail')->where('key', 'not like', 'mail_smtp_%')->where('key', 'not like', 'coming_soon_%')->where('key', 'not like', 'google_oauth_%')->where('key', '!=', 'platform_feature_switches')->orderBy('group')->orderBy('key')->get()->filter(fn ($setting) => $this->settingIsLive($setting->key, $setting->group))->values()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:100', 'not_regex:/^(mail_smtp_|coming_soon_|google_oauth_|platform_feature_switches$)/'],
            'settings.*.value' => ['nullable', 'string'],
            'settings.*.group' => ['nullable', 'string', 'max:50'],
            'settings.*.label' => ['nullable', 'string', 'max:120'],
        ]);

        foreach ($data['settings'] as $item) {
            abort_unless($this->settingIsLive($item['key'], Setting::where('key', $item['key'])->value('group') ?? $item['group'] ?? null), 404, 'Not found.');
            Setting::setValue($item['key'], $item['value'], $item['group'] ?? 'general', $item['label'] ?? null);
        }

        AuditLogService::log('settings.updated', null, null, ['keys' => collect($data['settings'])->pluck('key')]);

        return $this->index();
    }

    public function google(Request $request, GoogleOAuthConfiguration $google): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        return response()->json(['data' => $google->settings()]);
    }

    public function updateGoogle(Request $request, GoogleOAuthConfiguration $google): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $data = $request->validate(['enabled' => 'required|boolean', 'client_id' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/'], 'client_secret' => 'nullable|string|max:2048', 'clear_secret' => 'sometimes|boolean', 'frontend_url' => 'nullable|url:http,https|max:255']);
        if (! empty($data['frontend_url'])) {
            $parts = parse_url($data['frontend_url']);
            abort_if(isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']) || ! in_array($parts['path'] ?? '', ['', '/'], true), 422, 'Use the website origin without a path, query or credentials.');
            abort_if(($parts['scheme'] ?? '') !== 'https' && ! in_array($parts['host'] ?? '', ['localhost', '127.0.0.1'], true), 422, 'Use HTTPS for a live website.');
        }
        $google->save($data);
        AuditLogService::log('settings.google_oauth_updated', $request->user(), null, ['enabled' => $data['enabled']]);

        return response()->json(['data' => $google->settings()]);
    }

    public function smtp(Request $request, SmtpConfiguration $smtp): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        return response()->json(['data' => $smtp->publicSettings()]);
    }

    public function updateSmtp(Request $request, SmtpConfiguration $smtp): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'host' => ['required_if:enabled,true', 'nullable', 'string', 'max:255'],
            'port' => ['required_if:enabled,true', 'nullable', 'integer', 'between:1,65535'],
            'scheme' => ['required', Rule::in(['smtp', 'smtps'])],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:1024'],
            'clear_password' => ['sometimes', 'boolean'],
            'from_address' => ['required_if:enabled,true', 'nullable', 'email', 'max:255'],
            'from_name' => ['required_if:enabled,true', 'nullable', 'string', 'max:255'],
        ]);

        $smtp->save($data);
        AuditLogService::log('settings.smtp_updated', $request->user(), null, ['enabled' => $data['enabled']]);

        return response()->json(['data' => $smtp->publicSettings()]);
    }

    public function testSmtp(Request $request, SmtpConfiguration $smtp): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate(['recipient' => ['required', 'email', 'max:255']]);
        abort_unless($smtp->publicSettings()['enabled'], 422, 'Save and enable SMTP first.');

        try {
            $smtp->apply();
            Mail::purge('smtp');
            Mail::raw('This is a test message from Hire Safe.', fn ($message) => $message
                ->to($data['recipient'])
                ->subject('Hire Safe SMTP test'));
        } catch (\Throwable $e) {
            report($e);
            abort(422, 'Could not send the test email. Check the SMTP settings and try again.');
        }

        AuditLogService::log('settings.smtp_tested', $request->user(), null, ['recipient' => $data['recipient']]);

        return response()->json(['message' => 'Test email sent.']);
    }

    private function settingIsLive(string $key, ?string $group): bool
    {
        $features = app(PlatformFeatures::class);
        if ($key === 'require_nin_for_public') {
            return $features->enabled('helper_directory');
        }
        if ($key === 'verification_report_price') {
            return $features->enabled('verification_reports');
        }
        if ($key === 'reference_check_price') {
            return $features->enabled('reference_checks');
        }
        if ($key === 'platform_fee_percent') {
            return $features->enabled('payments');
        }
        if ($group === 'payments') {
            return $features->enabled('payments');
        }
        if ($group === 'trust' || str_starts_with($key, 'trust_score_')) {
            return $features->enabled('trust_scores');
        }

        return true;
    }
}
