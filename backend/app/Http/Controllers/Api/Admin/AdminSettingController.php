<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogService;
use App\Services\SmtpConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AdminSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Setting::query()->where('group', '!=', 'mail')->where('key', 'not like', 'mail_smtp_%')->where('key', 'not like', 'coming_soon_%')->orderBy('group')->orderBy('key')->get()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:100', 'not_regex:/^(mail_smtp_|coming_soon_)/'],
            'settings.*.value' => ['nullable', 'string'],
            'settings.*.group' => ['nullable', 'string', 'max:50'],
            'settings.*.label' => ['nullable', 'string', 'max:120'],
        ]);

        foreach ($data['settings'] as $item) {
            Setting::setValue($item['key'], $item['value'], $item['group'] ?? 'general', $item['label'] ?? null);
        }

        AuditLogService::log('settings.updated', null, null, ['keys' => collect($data['settings'])->pluck('key')]);

        return $this->index();
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
}
