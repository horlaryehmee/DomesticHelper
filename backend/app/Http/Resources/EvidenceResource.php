<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Evidence metadata only — the file itself is behind an authorized download. */
class EvidenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'uploader' => $this->whenLoaded('uploader', fn () => $this->uploader?->full_name),
            'created_at' => $this->created_at?->toIso8601String(),
            'download_url' => $this->when($request->user()?->can('view', $this->resource), "/api/evidence/{$this->uuid}/download"),
        ];
    }
}
