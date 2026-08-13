<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'status' => $this->status?->value,
            'cover_note' => $this->cover_note,
            'job' => $this->whenLoaded('job', fn () => [
                'uuid' => $this->job->uuid,
                'title' => $this->job->title,
                'work_type' => $this->job->work_type,
                'city' => $this->job->city,
                'state' => $this->job->state,
                'status' => $this->job->status?->value,
            ]),
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
                'photo_url' => $this->helper->helperProfile?->photo_path ? asset('storage/'.$this->helper->helperProfile->photo_path) : null,
                'city' => $this->helper->helperProfile?->city,
                'state' => $this->helper->helperProfile?->state,
                'years_experience' => $this->helper->helperProfile?->years_experience,
                'skills' => $this->helper->helperProfile?->skills?->pluck('name'),
                'verification_status' => $this->helper->helperProfile?->verification_status?->value,
                'trust_score' => $this->helper->trustScore?->score ?? 50,
                'average_rating' => round($this->helper->reviewsReceived()->where('status', 'approved')->avg('rating') ?? 0, 1),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
