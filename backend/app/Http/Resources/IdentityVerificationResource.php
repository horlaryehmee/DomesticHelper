<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IdentityVerificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'type' => $this->type?->value,
            'status' => $this->status?->value,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'evidence' => $this->whenLoaded('evidence', fn () => EvidenceResource::collection($this->evidence)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
