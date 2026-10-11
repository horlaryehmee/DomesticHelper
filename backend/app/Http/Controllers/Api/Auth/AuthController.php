<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterEmployerRequest;
use App\Http\Requests\Auth\RegisterHelperRequest;
use App\Http\Resources\UserResource;
use App\Models\EmployerProfile;
use App\Models\HelperProfile;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use App\Notifications\PlatformNotification;

class AuthController extends Controller
{
    public function registerEmployer(RegisterEmployerRequest $request, NotificationService $notifications): JsonResponse
    {
        $data = $request->validated();
        $ninHash = hash('sha256', $data['nin']);
        abort_if(DB::table('registration_verification_details')->where('nin_hash', $ninHash)->exists()
            || HelperProfile::query()->where('nin_hash', $ninHash)->exists(), 422, 'An account with this NIN already exists.');
        $proofPath = $request->file('address_proof')->store('registration/address-proof', 'private');
        abort_unless($proofPath, 500, 'Could not save the address document.');

        try {
            $user = DB::transaction(function () use ($data, $proofPath, $ninHash) {
            $user = User::create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => strtolower($data['email']),
                'phone' => $data['phone'],
                'password' => $data['password'],
                'user_type' => UserType::Employer,
            ]);

            $user->employerProfile()->create([
                'profile_type' => $data['profile_type'],
                'agency_name' => $data['agency_name'] ?? null,
                'address_line' => $data['address_line'],
                'city' => $data['city'],
                'state' => $data['state'],
            ]);

            $this->saveRegistrationDetails($user, $data, $ninHash, $proofPath);

            return $user;
            });
        } catch (\Throwable $e) {
            Storage::disk('private')->delete($proofPath);
            throw $e;
        }

        AuditLogService::log('auth.registered', $user, null, ['user_type' => 'employer']);

        $notifications->send($user, new PlatformNotification(
            type: 'welcome',
            title: 'Welcome to Hire Safe',
            body: 'Your employer account has been created. Verify your phone to start hiring safely.',
        ));

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'token' => $token,
            'user' => new UserResource($user->load('employerProfile')),
        ], 201);
    }

    public function registerHelper(RegisterHelperRequest $request, NotificationService $notifications): JsonResponse
    {
        $data = $request->validated();

        $nin = $data['nin'];
        $ninHash = hash('sha256', $nin);

        abort_if(
            HelperProfile::query()->where('nin_hash', $ninHash)->exists()
                || DB::table('registration_verification_details')->where('nin_hash', $ninHash)->exists(),
            422,
            'A helper profile with this NIN already exists.',
        );

        $proofPath = $request->file('address_proof')->store('registration/address-proof', 'private');
        abort_unless($proofPath, 500, 'Could not save the address document.');

        try {
            $user = DB::transaction(function () use ($data, $nin, $ninHash, $request, $proofPath) {
            $user = User::create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => strtolower($data['email']),
                'phone' => $data['phone'],
                'password' => $data['password'],
                'user_type' => UserType::Helper,
            ]);

            $profile = $user->helperProfile()->create([
                'date_of_birth' => $data['date_of_birth'],
                'gender' => $data['gender'],
                'state' => $data['state'],
                'city' => $data['city'],
                'address_line' => $data['address_line'],
                'nin_encrypted' => Crypt::encryptString($nin), // encrypted at rest
                'nin_hash' => $ninHash,
                'nin_last4' => substr($nin, -4),
                'years_experience' => $data['years_experience'],
                'availability' => $data['availability'],
                'employment_type' => $data['employment_type'] ?? 'any',
                'expected_salary_min' => $data['expected_salary_min'],
                'expected_salary_max' => $data['expected_salary_max'] ?? null,
                'bio' => $data['bio'] ?? null,
                'is_public' => true,
            ]);

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('profiles', 'public');
                $profile->forceFill(['photo_path' => $path])->save();
            }

            $profile->skills()->sync($data['skills']);
            $this->saveRegistrationDetails($user, $data, $ninHash, $proofPath);

            return $user;
            });
        } catch (\Throwable $e) {
            Storage::disk('private')->delete($proofPath);
            throw $e;
        }

        AuditLogService::log('auth.registered', $user, null, ['user_type' => 'helper']);

        $notifications->send($user, new PlatformNotification(
            type: 'welcome',
            title: 'Welcome to Hire Safe',
            body: 'Your helper profile has been created. Verify your phone and complete your identity verification to build trust.',
        ));

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'token' => $token,
            'user' => new UserResource($user->load('helperProfile.skills')),
        ], 201);
    }

    private function saveRegistrationDetails(User $user, array $data, string $ninHash, string $proofPath): void
    {
        DB::table('registration_verification_details')->insert([
            'user_id' => $user->id,
            'nin_encrypted' => Crypt::encryptString($data['nin']),
            'nin_hash' => $ninHash,
            'nin_last4' => substr($data['nin'], -4),
            'guarantor_name_encrypted' => Crypt::encryptString($data['guarantor_name']),
            'guarantor_phone_encrypted' => Crypt::encryptString($data['guarantor_phone']),
            'guarantor_relationship_encrypted' => Crypt::encryptString($data['guarantor_relationship']),
            'address_proof_path' => $proofPath,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $this->guardAgainstBruteForce($request);

        $credentials = [
            $request->loginField() => $request->input('login'),
            'password' => $request->input('password'),
        ];

        if (! auth()->attempt($credentials)) {
            RateLimiter::hit($this->throttleKey($request));
            throw ValidationException::withMessages(['login' => 'These credentials do not match our records.']);
        }

        $user = auth()->user();
        abort_if($user->status->value !== 'active', 403, 'This account has been suspended. Contact support.');

        RateLimiter::clear($this->throttleKey($request));

        $user->touchActivity();
        AuditLogService::log('auth.login', $user);

        return response()->json([
            'token' => $user->createToken('auth')->plainTextToken,
            'user' => new UserResource($user->load(['employerProfile', 'helperProfile.skills'])),
        ]);
    }

    public function logout(): JsonResponse
    {
        request()->user()->currentAccessToken()->delete();

        AuditLogService::log('auth.logout', request()->user());

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(): JsonResponse
    {
        $user = request()->user()->load(['employerProfile', 'helperProfile.skills', 'roles']);

        return response()->json(['user' => new UserResource($user)]);
    }

    private function guardAgainstBruteForce(LoginRequest $request): void
    {
        if (RateLimiter::tooManyAttempts($this->throttleKey($request), 5)) {
            throw ValidationException::withMessages(['login' => 'Too many login attempts. Please try again in a few minutes.']);
        }
    }

    private function throttleKey(LoginRequest $request): string
    {
        return 'login:'.$request->ip().'|'.$request->input('login');
    }
}
