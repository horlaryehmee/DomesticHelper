<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Employment record for participants/staff — includes private fields. */
class EmploymentRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'job_role' => $this->job_role,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'salary' => $this->salary,
            'employment_type' => $this->employment_type?->value,
            'location' => $this->location,
            'status' => $this->status?->value,
            'verification_status' => $this->verification_status?->value,
            'termination_reason' => $this->termination_reason,
            'performance_rating' => $this->performance_rating,
            'employer' => $this->whenLoaded('employer', fn () => [
                'uuid' => $this->employer->uuid,
                'name' => $this->employer->full_name,
            ]),
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
            ]),
            'review' => $this->whenLoaded('review', fn () => new ReviewResource($this->review)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
