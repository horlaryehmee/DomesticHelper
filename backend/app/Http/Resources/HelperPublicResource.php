<?php

namespace App\Http\Resources;

use App\Services\VerificationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * PUBLIC helper profile. Strict whitelist:
 * no NIN, no exact address, no private phone, no internal notes.
 */
class HelperPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profile = $this->helperProfile ?? null;
        $trustScore = $profile?->trustScore;
        $eventsCount = $trustScore?->events_count ?? 0;

        $verification = app(VerificationService::class)->badgesFor($this->resource);

        $reviewsLoaded = $this->resource->relationLoaded('reviewsReceived');
        $employmentLoaded = $this->resource->relationLoaded('employmentRecordsAsHelper');
        $skillsLoaded = $profile && $profile->relationLoaded('skills');

        $approvedReviews = $reviewsLoaded ? $this->reviewsReceived : null;
        $verifiedEmployment = $employmentLoaded ? $this->employmentRecordsAsHelper : null;

        return [
            'uuid' => $this->uuid,
            'name' => $this->full_name,
            'photo_url' => $profile?->photo_path ? asset('storage/'.$profile->photo_path) : null,
            'city' => $profile?->city,
            'state' => $profile?->state,
            'gender' => $profile?->gender?->value,
            'bio' => $profile?->bio,
            'years_experience' => $profile?->years_experience,
            'availability' => $profile?->availability?->value,
            'employment_type' => $profile?->employment_type?->value,
            'expected_salary_min' => $profile?->expected_salary_min,
            'expected_salary_max' => $profile?->expected_salary_max,
            'skills' => $skillsLoaded
                ? $profile->skills->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'slug' => $s->slug])
                : [],
            'verification_status' => $profile?->verification_status?->value,
            'verification_badges' => $verification,
            'trust_score' => [
                'score' => $trustScore?->score ?? 50,
                'category' => $eventsCount === 0 ? 'new' : $trustScore?->category?->value,
                'label' => $eventsCount === 0 ? 'Building Trust' : $trustScore?->category?->label(),
                'calculated_at' => $trustScore?->calculated_at?->toIso8601String(),
            ],
            'average_rating' => round(
                $this->resource->getAttribute('reviews_received_avg_rating')
                    ?? ($approvedReviews?->avg('rating') ?? 0),
                1,
            ),
            'reviews_count' => $this->resource->getAttribute('reviews_count')
                ?? $approvedReviews?->count()
                ?? 0,
            'verified_jobs_count' => $verifiedEmployment?->count() ?? 0,
            'last_active_at' => $this->last_active_at?->toIso8601String(),
        ];
    }
}
