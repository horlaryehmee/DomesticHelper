<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VerificationReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'status' => $this->status?->value,
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
            ]),
            'snapshot' => $this->when($this->status?->value === 'generated', $this->snapshot),
            'generated_at' => $this->generated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
