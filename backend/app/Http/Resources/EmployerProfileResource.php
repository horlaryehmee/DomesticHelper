<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Employer's own profile. */
class EmployerProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'profile_type' => $this->profile_type?->value,
            'agency_name' => $this->agency_name,
            'address_line' => $this->address_line,
            'city' => $this->city,
            'state' => $this->state,
            'bio' => $this->bio,
            'profile_completed' => $this->profile_completed,
        ];
    }
}
