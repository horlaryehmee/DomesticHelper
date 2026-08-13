<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $me = $request->user();

        return [
            'uuid' => $this->uuid,
            'other_user' => [
                'uuid' => $this->otherUser($me)->uuid,
                'name' => $this->otherUser($me)->full_name,
                'photo_url' => $this->otherUser($me)->helperProfile?->photo_path
                    ? asset('storage/'.$this->otherUser($me)->helperProfile->photo_path)
                    : ($this->otherUser($me)->avatar_path ? asset('storage/'.$this->otherUser($me)->avatar_path) : null),
            ],
            'job' => $this->whenLoaded('job', fn () => $this->job ? ['uuid' => $this->job->uuid, 'title' => $this->job->title] : null),
            'last_message' => $this->whenLoaded('messages', function () {
                $last = $this->messages->last();
                return $last ? [
                    'body' => mb_strimwidth($last->body, 0, 120, '…'),
                    'sender_id' => $last->sender_id,
                    'created_at' => $last->created_at?->toIso8601String(),
                ] : null;
            }),
            'unread_count' => $this->when(isset($this->unread_count), (int) ($this->unread_count ?? 0)),
            'blocked_by' => $this->blocked_by,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
        ];
    }
}
