<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** PUBLIC review — only ever fed with status=approved reviews. */
class ReviewPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'rating' => $this->rating,
            'work_type' => $this->work_type,
            'duration_worked' => $this->duration_worked,
            'feedback' => $this->feedback,
            'job_role' => $this->whenLoaded('employmentRecord', fn () => $this->employmentRecord?->job_role),
            'employer_name' => $this->whenLoaded('employer', fn () => $this->employer?->full_name),
            'employer_type' => $this->whenLoaded('employer', fn () => $this->employer?->employerProfile?->profile_type?->value ?? 'individual'),
            'responses' => $this->whenLoaded('responses', fn () => $this->responses->map(fn ($r) => [
                'author_name' => $r->user->full_name,
                'content' => $r->content,
                'created_at' => $r->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
