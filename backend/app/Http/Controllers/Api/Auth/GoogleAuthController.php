<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\ComingSoon;
use App\Services\EmailVerificationService;
use App\Services\GoogleAccountService;
use App\Services\GoogleOAuthConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GoogleAuthController extends Controller
{
    public function status(GoogleOAuthConfiguration $config)
    {
        return response()->json(['enabled' => $config->ready()]);
    }

    public function redirect(Request $request, GoogleOAuthConfiguration $config)
    {
        abort_unless($config->ready(), 503, 'Google sign-in is not enabled.');
        if ($request->input('intent') === 'register') {
            $comingSoon = app(ComingSoon::class);
            abort_if($comingSoon->enabled() && ! $comingSoon->hasPreviewAccess($request->input('preview')), 503, 'Site is coming soon. Use your preview link to register.');
        }
        $data = $request->validate(['intent' => 'required|in:login,register', 'user_type' => 'required_if:intent,register|nullable|in:employer,helper', 'terms' => 'required_if:intent,register|nullable|accepted', 'challenge' => ['required', 'regex:/^[a-f0-9]{64}$/']]);
        $request->session()->put('google_login', ['intent' => $data['intent'], 'user_type' => $data['user_type'] ?? null, 'challenge' => $data['challenge'], 'created_at' => time()]);

        return $config->provider()->with(['prompt' => 'select_account'])->redirect()->header('Referrer-Policy', 'no-referrer');
    }

    public function callback(Request $request, GoogleOAuthConfiguration $config, GoogleAccountService $accounts, EmailVerificationService $email)
    {
        $settings = $config->settings();
        abort_unless($settings['frontend_url'], 503);
        $target = $settings['frontend_url'].'/auth/google/callback';
        try {
            abort_unless($config->ready(), 503);
            $flow = $request->session()->pull('google_login');
            if (! $flow || time() - $flow['created_at'] > 600 || $request->has('error')) {
                throw ValidationException::withMessages(['google' => 'Google sign-in was cancelled or expired. Please try again.']);
            }
            $google = $config->provider()->user();
            $user = $accounts->resolve($google, $flow['intent'], $flow['user_type']);
            if (! $user->email_verified_at) {
                try {
                    $email->send($user);
                } catch (\Throwable $e) {
                    Log::warning('Could not send Google signup email verification.');
                }
            }
            $request->session()->regenerate();
            $code = Str::random(64);
            Cache::put('google-handoff:'.hash('sha256', $code), ['user_id' => $user->id, 'challenge' => $flow['challenge']], now()->addMinutes(2));

            return redirect()->away($target.'#code='.$code)->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first();
        } catch (\Throwable $e) {
            Log::warning('Google sign-in failed.', ['exception' => get_class($e)]);
            $message = 'Google sign-in could not be completed. Please try again or sign in with your password.';
        }

        return redirect()->away($target.'#error='.rawurlencode($message))->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function exchange(Request $request, GoogleOAuthConfiguration $config)
    {
        abort_unless($config->ready(), 503, 'Google sign-in is disabled.');
        $data = $request->validate(['code' => 'required|string|size:64', 'verifier' => 'required|string|size:64']);
        $key = 'google-handoff:'.hash('sha256', $data['code']);
        $result = Cache::lock($key.':lock', 5)->get(function () use ($request, $data, $key) {
            $entry = Cache::get($key);
            abort_unless($entry && hash_equals($entry['challenge'], hash('sha256', $data['verifier'])), 422, 'Google sign-in expired. Please try again.');
            Cache::forget($key);
            $user = User::findOrFail($entry['user_id']);
            abort_unless($user->status->value === 'active', 403, 'Account unavailable.');
            $request->setUserResolver(fn () => $user);
            $user->touchActivity();
            AuditLogService::log('auth.google_login', $user);

            return response()->json(['token' => $user->createToken('auth')->plainTextToken, 'user' => [...(new UserResource($user->load(['employerProfile', 'helperProfile.skills'])))->resolve($request), 'phone' => $user->phone]])->header('Cache-Control', 'no-store');
        });
        abort_if($result === false, 422, 'Sign-in is already being processed.');

        return $result;
    }

    public function contact(Request $request)
    {
        $user = $request->user();
        abort_unless($user->google_id && $user->email_verified_at && $user->approval_status === 'draft' && ! $user->phone, 403);
        $data = $request->validate(['first_name' => 'required|string|max:60', 'last_name' => 'required|string|max:60', 'phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/', 'unique:users,phone']]);
        $user->update($data);

        return response()->json(['user' => new UserResource($user)]);
    }
}
