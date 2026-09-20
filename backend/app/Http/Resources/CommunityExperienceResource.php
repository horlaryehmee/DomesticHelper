<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunityExperienceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user()?->isAdmin() ?? false;
        preg_match('~instagram\.com/(?:reel|p)/([^/?#]+)~i', (string) $this->source_url, $sourceMatch);
        $mediaFile = isset($sourceMatch[1]) ? public_path('community-media/'.$sourceMatch[1].'.mp4') : null;

        return [
            'uuid' => $this->uuid,
            'content_type' => $this->content_type,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'subject_name' => $this->subject_name,
            'location' => $this->location,
            'incident_date' => $this->incident_date?->toDateString(),
            'source_url' => $this->source_url,
            'media_url' => $mediaFile && is_file($mediaFile) ? '/community-media/'.$sourceMatch[1].'.mp4' : null,
            'status' => $this->when($isAdmin, $this->status),
            'verification_level' => $this->verification_level,
            'submitter_name' => $this->when($isAdmin, $this->submitter_name),
            'submitter_email' => $this->when($isAdmin, $this->submitter_email),
            'submitter_phone' => $this->when($isAdmin, $this->submitter_phone),
            'moderation_note' => $this->when($isAdmin, $this->moderation_note),
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
