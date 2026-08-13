<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Helper's own profile view — includes private completion data but NEVER NIN/address. */
class HelperProfileOwnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'gender' => $this->gender?->value,
            'state' => $this->state,
            'city' => $this->city,
            'address_line' => $this->address_line, // owner-only endpoint
            'nin_last4' => $this->nin_last4,
            'photo_url' => $this->photo_path ? asset('storage/'.$this->photo_path) : null,
            'bio' => $this->bio,
            'years_experience' => $this->years_experience,
            'availability' => $this->availability?->value,
            'employment_type' => $this->employment_type?->value,
            'expected_salary_min' => $this->expected_salary_min,
            'expected_salary_max' => $this->expected_salary_max,
            'is_public' => $this->is_public,
            'verification_status' => $this->verification_status?->value,
            'profile_completed' => $this->profile_completed,
            'skills' => $this->whenLoaded('skills', fn () => $this->skills->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slug' => $s->slug,
                'years' => (int) $s->pivot->years,
            ])),
        ];
    }
}
