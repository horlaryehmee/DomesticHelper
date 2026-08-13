<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'uuid' => $this->uuid,
            'title' => $this->title,
            'work_type' => $this->work_type,
            'description' => $this->description,
            'responsibilities' => $this->responsibilities,
            'requirements' => $this->requirements,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'salary_type' => $this->salary_type,
            'location' => $this->location,
            'state' => $this->state,
            'city' => $this->city,
            'working_hours' => $this->working_hours,
            'accommodation_available' => $this->accommodation_available,
            'employment_type' => $this->employment_type?->value,
            'start_date' => $this->start_date?->toDateString(),
            'status' => $this->status?->value,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'employer' => $this->whenLoaded('employer', fn () => [
                'uuid' => $this->employer->uuid,
                'name' => $this->employer->employerProfile?->profile_type?->value === 'agency'
                    ? ($this->employer->employerProfile->agency_name ?? $this->employer->full_name)
                    : $this->employer->full_name,
                'profile_type' => $this->employer->employerProfile?->profile_type?->value ?? 'individual',
                'state' => $this->employer->employerProfile?->state,
            ]),
            'applications_count' => $this->whenCounted('applications'),
            'my_application' => $this->when(
                $user && $this->relationLoaded('applications'),
                fn () => $this->applications->firstWhere('helper_id', $user->id)?->status?->value,
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
