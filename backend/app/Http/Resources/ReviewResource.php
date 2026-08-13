<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Review as shown to its participants — moderated status included. */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'rating' => $this->rating,
            'work_type' => $this->work_type,
            'duration_worked' => $this->duration_worked,
            'feedback' => $this->feedback,
            'status' => $this->status?->value,
            'employment' => $this->whenLoaded('employmentRecord', fn () => [
                'uuid' => $this->employmentRecord->uuid,
                'job_role' => $this->employmentRecord->job_role,
                'start_date' => $this->employmentRecord->start_date?->toDateString(),
                'end_date' => $this->employmentRecord->end_date?->toDateString(),
            ]),
            'employer' => $this->whenLoaded('employer', fn () => [
                'uuid' => $this->employer->uuid,
                'name' => $this->employer->full_name,
                'avatar_url' => $this->employer->avatar_path ? asset('storage/'.$this->employer->avatar_path) : null,
            ]),
            'helper' => $this->whenLoaded('helper', fn () => [
                'uuid' => $this->helper->uuid,
                'name' => $this->helper->full_name,
            ]),
            'responses' => $this->whenLoaded('responses', fn () => $this->responses->map(fn ($r) => [
                'author_name' => $r->user->full_name,
                'content' => $r->content,
                'created_at' => $r->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
