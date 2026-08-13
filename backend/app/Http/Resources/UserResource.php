<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Full user payload — only for the authenticated user themself or staff. */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isSelf = $request->user()?->id === $this->id;
        $isAdmin = $request->user()?->isAdmin();

        return [
            'uuid' => $this->uuid,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'name' => $this->full_name,
            'email' => $this->email,
            'email_verified' => (bool) $this->email_verified_at,
            'phone' => $this->when($isSelf || $isAdmin, $this->phone),
            'phone_verified' => (bool) $this->phone_verified_at,
            'user_type' => $this->user_type?->value,
            'status' => $this->status?->value,
            'avatar_url' => $this->avatar_path ? asset('storage/'.$this->avatar_path) : null,
            'last_active_at' => $this->last_active_at?->toIso8601String(),
            'roles' => $this->when($isAdmin, fn () => $this->roles->pluck('slug')),
            'employer_profile' => $this->whenLoaded('employerProfile', fn () => new EmployerProfileResource($this->employerProfile)),
            'helper_profile' => $this->whenLoaded('helperProfile', fn () => new HelperProfileOwnResource($this->helperProfile)),
            'profile_completion' => $this->when($isSelf || $isAdmin, fn () => app(\App\Services\VerificationService::class)->completionPercent($this->resource)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
