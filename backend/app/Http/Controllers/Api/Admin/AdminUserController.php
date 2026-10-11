<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->with(['employerProfile', 'helperProfile'])
            ->when($request->input('type'), fn ($q, $t) => $q->where('user_type', $t))
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('q'), fn ($q, $s) => $q->where(function ($b) use ($s) {
                $b->whereRaw('LOWER(CONCAT(first_name, " ", last_name)) LIKE ?', ['%'.mb_strtolower($s).'%'])
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            }));

        $users = $query->latest()->paginate(20);

        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => new UserResource($user->load(['employerProfile', 'helperProfile.skills', 'roles.permissions']))]);
    }

    public function registrationDetails(User $user): JsonResponse
    {
        $details = DB::table('registration_verification_details')->where('user_id', $user->id)->first();
        abort_unless($details, 404);
        AuditLogService::log('registration_details.viewed', $user);

        return response()->json(['data' => [
            'nin_last4' => $details->nin_last4,
            'guarantor_name' => Crypt::decryptString($details->guarantor_name_encrypted),
            'guarantor_phone' => Crypt::decryptString($details->guarantor_phone_encrypted),
            'guarantor_relationship' => Crypt::decryptString($details->guarantor_relationship_encrypted),
            'address_line' => $user->helperProfile?->address_line ?? $user->employerProfile?->address_line,
            'has_address_proof' => true,
        ]]);
    }

    public function addressProof(User $user): StreamedResponse
    {
        $details = DB::table('registration_verification_details')->where('user_id', $user->id)->first();
        abort_unless($details && Storage::disk('private')->exists($details->address_proof_path), 404);
        AuditLogService::log('registration_address_proof.downloaded', $user);

        return Storage::disk('private')->download($details->address_proof_path);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->authorize('suspend', $user);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->forceFill(['status' => $data['status']])->save();
        $user->tokens()->delete(); // force re-login / drop sessions

        AuditLogService::log('user.'.$data['status'], $user, null, ['reason' => $data['reason'] ?? null]);

        return response()->json(['data' => new UserResource($user->fresh()->load(['employerProfile', 'helperProfile']))]);
    }

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $this->authorize('assignRoles', $user);
        abort_unless($user->isAdmin(), 422, 'Staff roles can only be assigned to admin accounts.');

        $data = $request->validate(['roles' => ['required', 'array'], 'roles.*' => ['string', 'exists:roles,slug']]);

        $user->roles()->sync(Role::whereIn('slug', $data['roles'])->pluck('id'));

        AuditLogService::log('user.roles_assigned', $user, null, ['roles' => $data['roles']]);

        return response()->json(['data' => new UserResource($user->fresh()->load('roles.permissions'))]);
    }

    public function roles(): JsonResponse
    {
        return response()->json(['data' => Role::with('permissions')->get()]);
    }
}
