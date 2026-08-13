<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->data['type'] ?? $this->type,
            'title' => $this->data['title'] ?? '',
            'body' => $this->data['body'] ?? '',
            'action_url' => $this->data['action_url'] ?? null,
            'data' => $this->data['data'] ?? [],
            'read' => (bool) $this->read_at,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
