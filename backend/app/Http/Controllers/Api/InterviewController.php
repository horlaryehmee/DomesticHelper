<?php

namespace App\Http\Controllers\Api;

use App\Enums\InterviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInterviewRequest;
use App\Http\Resources\InterviewResource;
use App\Models\Interview;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class InterviewController extends Controller
{
    /** Interviews for the current user (either side). */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $interviews = Interview::query()
            ->where(fn ($q) => $q->where('employer_id', $user->id)->orWhere('helper_id', $user->id))
            ->with(['job', 'employer', 'helper.helperProfile'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(12);

        return response()->json([
            'data' => InterviewResource::collection($interviews),
            'meta' => [
                'current_page' => $interviews->currentPage(),
                'last_page' => $interviews->lastPage(),
                'per_page' => $interviews->perPage(),
                'total' => $interviews->total(),
            ],
        ]);
    }

    public function store(StoreInterviewRequest $request, NotificationService $notifications): JsonResponse
    {
        $employer = $request->user();
        $helper = User::where('uuid', $request->input('helper_uuid'))->firstOrFail();
        abort_unless($helper->isHelper(), 422);

        $interview = Interview::create([
            ...$request->validated(),
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'status' => InterviewStatus::Requested,
        ]);

        AuditLogService::log('interview.requested', $interview);

        $notifications->send($helper, new PlatformNotification(
            type: 'interview_requested',
            title: 'New interview request',
            body: "{$employer->full_name} invited you to a ".($interview->mode?->value === 'in_person' ? 'in-person' : $interview->mode?->value)." interview on {$interview->scheduled_at?->format('j M, g:ia')}.",
        ));

        return response()->json(['data' => new InterviewResource($interview->load(['job', 'employer', 'helper.helperProfile']))], 201);
    }

    public function show(Request $request, Interview $interview): JsonResponse
    {
        $this->authorize('view', $interview);

        return response()->json(['data' => new InterviewResource($interview->load(['job', 'employer', 'helper.helperProfile']))]);
    }

    /** Helper accepts or declines. */
    public function respond(Request $request, Interview $interview, NotificationService $notifications): JsonResponse
    {
        $this->authorize('respond', $interview);

        $data = $request->validate(['response' => ['required', 'in:accepted,declined']]);
        $interview->forceFill(['status' => $data['response']])->save();

        AuditLogService::log('interview.'.$data['response'], $interview);

        $notifications->send($interview->employer, new PlatformNotification(
            type: 'interview_'.$data['response'],
            title: $data['response'] === 'accepted' ? 'Interview accepted' : 'Interview declined',
            body: "{$interview->helper->full_name} has ".($data['response'] === 'accepted' ? 'accepted' : 'declined')." your interview request.",
        ));

        return response()->json(['data' => new InterviewResource($interview->load(['job', 'employer', 'helper.helperProfile']))]);
    }

    /** Either party can cancel or mark completed. */
    public function update(Request $request, Interview $interview, NotificationService $notifications): JsonResponse
    {
        $this->authorize('update', $interview);

        $data = $request->validate([
            'status' => ['sometimes', 'in:completed,cancelled'],
            'scheduled_at' => ['sometimes', 'date'],
            'mode' => ['sometimes', 'in:in_person,phone,video'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $interview->update($data);

        AuditLogService::log('interview.updated', $interview, null, $data);

        $other = $request->user()->id === $interview->employer_id ? $interview->helper : $interview->employer;
        $notifications->send($other, new PlatformNotification(
            type: 'interview_updated',
            title: 'Interview updated',
            body: 'An interview you are involved in has been updated.',
        ));

        return response()->json(['data' => new InterviewResource($interview->fresh()->load(['job', 'employer', 'helper.helperProfile']))]);
    }
}
