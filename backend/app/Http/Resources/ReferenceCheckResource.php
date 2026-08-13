<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReferenceCheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user()?->isAdmin();

        return [
            'uuid' => $this->uuid,
            'referee_name' => $this->referee_name,
            'referee_phone' => $this->referee_phone,
            'referee_email' => $this->referee_email,
            'relationship' => $this->relationship,
            'employment_period' => $this->employment_period,
            'status' => $this->status?->value,
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
            ]),
            // Operator findings are private; purchasers see only a verified summary flag.
            'findings' => $this->when($isAdmin && $this->status?->value === 'completed', [
                'worked_there' => $this->worked_there,
                'confirmed_role' => $this->confirmed_role,
                'duration_reported' => $this->duration_reported,
                'would_rehire' => $this->would_rehire,
                'performance_notes' => $this->performance_notes,
                'reason_for_leaving' => $this->reason_for_leaving,
                'additional_notes' => $this->additional_notes,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
        ];
    }
}
