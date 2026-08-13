<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Trust score event — visible to the helper themself and staff. */
class TrustScoreEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'event_type' => $this->event_type,
            'points' => $this->points,
            'note' => $this->note,
            'helper_name' => $this->whenLoaded('helper', fn () => $this->helper->full_name),
            'helper_uuid' => $this->whenLoaded('helper', fn () => $this->helper->uuid),
            'source_type' => $this->source_type ? class_basename($this->source_type) : null,
            'rule' => $this->whenLoaded('rule', fn () => ['slug' => $this->rule?->slug, 'name' => $this->rule?->name]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
