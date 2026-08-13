<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Private — helper owner and staff only. */
class DisputeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'reason' => $this->reason,
            'explanation' => $this->explanation,
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
            ]),
            'status' => $this->status?->value,
            'disputable_type' => class_basename($this->disputable_type),
            'disputable' => $this->whenLoaded('disputable', function () {
                return match (true) {
                    $this->disputable instanceof \App\Models\Review => new ReviewResource($this->disputable),
                    $this->disputable instanceof \App\Models\Report => new ReportResource($this->disputable),
                    $this->disputable instanceof \App\Models\TrustScoreEvent => new TrustScoreEventResource($this->disputable),
                    default => null,
                };
            }),
            'resolution_decision' => $this->resolution_decision,
            'resolution_reason' => $this->resolution_reason,
            'evidence' => $this->whenLoaded('evidence', fn () => EvidenceResource::collection($this->evidence)),
            'created_at' => $this->created_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
        ];
    }
}
