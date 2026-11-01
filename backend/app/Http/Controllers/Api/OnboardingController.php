<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\EmailVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OnboardingController extends Controller
{
    public function signup(Request $request, EmailVerificationService $verification)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:60', 'last_name' => 'required|string|max:60',
            'email' => 'required|email|max:120|unique:users,email', 'phone' => ['required', 'regex:/^\+?[0-9]{10,15}$/', 'unique:users,phone'],
            'password' => 'required|string|min:8|confirmed', 'user_type' => 'required|in:employer,helper',
        ]);
        $user = DB::transaction(function () use ($data) {
            $user = User::create($data);
            $user->forceFill(['approval_status' => 'draft'])->save();

            return $user;
        });
        AuditLogService::log('auth.signed_up', $user);

        $emailSent = true;
        try {
            $verification->send($user);
        } catch (\Throwable $exception) {
            report($exception);
            $emailSent = false;
        }

        return response()->json(['verification_email_sent' => $emailSent, 'token' => $user->createToken('auth')->plainTextToken, 'user' => [...(new UserResource($user))->resolve($request), 'phone' => $user->phone]], 201);
    }

    public function confirm(Request $request)
    {
        $request->validate(['confirmed' => 'required|accepted']);
        $user = $request->user();
        abort_unless($user->approval_status === 'draft', 403);
        abort_unless($user->email_verified_at, 403, 'Verify your email before onboarding.');
        $user->forceFill(['details_confirmed_at' => now()])->save();

        return response()->json(['user' => new UserResource($user)]);
    }

    public function accounts(Request $request)
    {
        $status = $request->validate(['status' => 'nullable|in:pending,approved,rejected'])['status'] ?? 'pending';

        return UserResource::collection(User::whereNotNull('onboarding_submitted_at')->where('approval_status', $status)->latest()->paginate(20));
    }

    public function decide(Request $request, User $user)
    {
        $data = $request->validate(['status' => 'required|in:approved,rejected', 'notes' => 'nullable|string|max:2000']);
        DB::transaction(function () use ($data, $user) {
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            abort_unless(! $user->isAdmin() && $user->email_verified_at && $user->onboarding_submitted_at && $user->approval_status === 'pending', 422, 'Only submitted pending accounts can be reviewed.');
            $user->forceFill(['approval_status' => $data['status'], 'approval_notes' => $data['notes'] ?? null])->save();
            if ($user->helperProfile) {
                $user->helperProfile->update(['is_public' => $data['status'] === 'approved']);
            }
            AuditLogService::log('account.'.$data['status'], $user, null, ['notes' => $data['notes'] ?? null]);
        });

        return response()->json(['message' => 'Account decision recorded.']);
    }
}
