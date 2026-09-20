<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommunityExperienceResource;
use App\Models\CommunityExperience;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommunityExperienceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = CommunityExperience::query()
            ->where('status', 'published')
            ->when($request->input('type'), fn ($q, $type) => $q->where('content_type', $type))
            ->orderByDesc('published_at')
            ->paginate(12);

        return response()->json([
            'data' => CommunityExperienceResource::collection($items),
            'meta' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'total' => $items->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'content_type' => ['required', Rule::in(['experience', 'video'])],
            'title' => ['required', 'string', 'min:8', 'max:160'],
            'description' => ['required', 'string', 'min:30', 'max:5000'],
            'category' => ['required', Rule::in(['theft', 'fraud', 'misconduct', 'abuse', 'property_damage', 'job_abandonment', 'other'])],
            'subject_name' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:160'],
            'incident_date' => ['nullable', 'date', 'before_or_equal:today'],
            'source_url' => ['nullable', 'required_if:content_type,video', 'url', 'max:500'],
            'submitter_name' => ['required', 'string', 'max:120'],
            'submitter_email' => ['required', 'email', 'max:190'],
            'submitter_phone' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'max:0'],
        ]);

        unset($data['website']);
        $item = CommunityExperience::create($data + ['status' => 'pending', 'verification_level' => 'submitted']);
        AuditLogService::log('community_experience.submitted', $item, null, ['content_type' => $item->content_type]);

        return response()->json([
            'message' => 'Thank you. Your submission is private while our team reviews it.',
            'data' => ['uuid' => $item->uuid, 'status' => $item->status],
        ], 201);
    }
}
