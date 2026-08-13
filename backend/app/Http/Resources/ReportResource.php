<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Private — participants and staff only. Never in public payloads. */
class ReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user()?->isAdmin();

        return [
            'uuid' => $this->uuid,
            'category' => $this->category?->value,
            'description' => $this->description,
            'status' => $this->status?->value,
            'outcome' => $this->when($this->outcome, fn () => $this->outcome?->value),
            'employment' => $this->whenLoaded('employmentRecord', fn () => [
                'uuid' => $this->employmentRecord?->uuid,
                'job_role' => $this->employmentRecord?->job_role,
                'start_date' => $this->employmentRecord?->start_date?->toDateString(),
                'end_date' => $this->employmentRecord?->end_date?->toDateString(),
            ]),
            'helper' => $this->whenLoaded('helper', fn () => ['uuid' => $this->helper->uuid, 'name' => $this->helper->full_name]),
            'reporter' => $this->whenLoaded('reporter', fn () => ['uuid' => $this->reporter->uuid, 'name' => $this->reporter->full_name]),
            'helper_response' => $this->when($isAdmin || $this->helper_id === $request->user()?->id, $this->helper_response),
            'admin_decision' => $this->when($isAdmin, $this->admin_decision),
            'evidence' => $this->whenLoaded('evidence', fn () => EvidenceResource::collection($this->evidence)),
            'created_at' => $this->created_at?->toIso8601String(),
            'decided_at' => $this->decided_at?->toIso8601String(),
        ];
    }
}
