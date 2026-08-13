<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InterviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'mode' => $this->mode?->value,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'location' => $this->location,
            'notes' => $this->notes,
            'status' => $this->status?->value,
            'job' => $this->whenLoaded('job', fn () => [
                'uuid' => $this->job?->uuid,
                'title' => $this->job?->title,
                'work_type' => $this->job?->work_type,
            ]),
            'employer' => $this->whenLoaded('employer', fn () => [
                'uuid' => $this->employer->uuid,
                'name' => $this->employer->full_name,
            ]),
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
                'photo_url' => $this->helper->helperProfile?->photo_path ? asset('storage/'.$this->helper->helperProfile->photo_path) : null,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
