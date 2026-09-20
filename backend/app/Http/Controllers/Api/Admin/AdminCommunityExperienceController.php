<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommunityExperienceResource;
use App\Models\CommunityExperience;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCommunityExperienceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = CommunityExperience::query()
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest()->paginate(20);

        return response()->json(['data' => CommunityExperienceResource::collection($items)]);
    }

    public function moderate(Request $request, CommunityExperience $communityExperience): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['published', 'rejected', 'removed'])],
            'verification_level' => ['required', Rule::in(['submitted', 'source_linked', 'evidence_reviewed'])],
            'moderation_note' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $old = $communityExperience->only(['status', 'verification_level']);
        $communityExperience->forceFill($data + [
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
            'published_at' => $data['status'] === 'published' ? ($communityExperience->published_at ?? now()) : null,
        ])->save();
        AuditLogService::log('community_experience.moderated', $communityExperience, $old, $data);

        return response()->json(['data' => new CommunityExperienceResource($communityExperience->fresh())]);
    }
}
