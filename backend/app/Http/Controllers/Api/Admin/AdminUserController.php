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
