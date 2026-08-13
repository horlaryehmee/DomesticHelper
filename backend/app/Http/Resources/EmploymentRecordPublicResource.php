<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * PUBLIC employment history entry — only verified records are ever placed
 * in a collection serialized by this resource (enforced in the controller).
 */
class EmploymentRecordPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'job_role' => $this->job_role,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'location' => $this->location,
            'employment_type' => $this->employment_type?->value,
            'status' => $this->status?->value,
        ];
    }
}
