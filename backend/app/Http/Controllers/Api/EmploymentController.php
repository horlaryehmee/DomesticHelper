<?php

namespace App\Http\Controllers\Api;

use App\Enums\EmploymentVerificationResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompleteEmploymentRequest;
use App\Http\Requests\StartEmploymentRequest;
use App\Http\Resources\EmploymentRecordResource;
use App\Models\EmploymentRecord;
use App\Models\EmploymentVerification;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\EmploymentService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class EmploymentController extends Controller
{
    /** All employment involving the current user (either side). */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = EmploymentRecord::query()
            ->where(fn ($q) => $q->where('employer_id', $user->id)->orWhere('helper_id', $user->id))
            ->with(['employer', 'helper', 'review'])
            ->latest();

        $records = $query->paginate(12);

        return response()->json([
            'data' => EmploymentRecordResource::collection($records),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function show(Request $request, EmploymentRecord $record): JsonResponse
    {
        $this->authorize('view', $record);

        return response()->json(['data' => new EmploymentRecordResource($record->load(['employer', 'helper', 'review']))]);
    }

    /** Employer confirms a hire → active employment record. */
    public function start(StartEmploymentRequest $request, EmploymentService $service, NotificationService $notifications): JsonResponse
    {
        $helper = User::where('uuid', $request->input('helper_uuid'))->firstOrFail();
        abort_unless($helper->isHelper(), 422, 'Invalid helper.');

        $record = $service->startEmployment($request->user(), $helper, $request->validated());

        $notifications->send($helper, new PlatformNotification(
            type: 'employment_started',
            title: 'Employment confirmed',
            body: "{$request->user()->full_name} has confirmed you as their {$record->job_role}.",
        ));

        return response()->json(['data' => new EmploymentRecordResource($record->load(['employer', 'helper']))], 201);
    }

    /** Employer closes out employment with end date, reason, performance. */
    public function complete(CompleteEmploymentRequest $request, EmploymentRecord $record, EmploymentService $service, NotificationService $notifications): JsonResponse
    {
        $this->authorize('complete', $record);

        $record = $service->complete($record, $request->validated());

        $notifications->send($record->helper, new PlatformNotification(
            type: 'employment_completed',
            title: 'Employment record updated',
            body: "Your employment as {$record->job_role} has been marked completed. You can request verification of this record from your dashboard.",
        ));

        return response()->json(['data' => new EmploymentRecordResource($record->fresh()->load(['employer', 'helper']))]);
    }

    /** Anyone in the record can request the previous employer's verification. */
    public function requestVerification(Request $request, EmploymentRecord $record, EmploymentService $service, NotificationService $notifications): JsonResponse
    {
        $this->authorize('requestVerification', $record);

        $verification = $service->requestVerification($record, $request->user());

        $notifications->send($record->employer, new PlatformNotification(
            type: 'employment_verification_requested',
            title: 'Employment verification requested',
            body: "Please confirm the employment details for {$record->helper->full_name} ({$record->job_role}).",
            actionUrl: "/verify-employment/{$verification->token}",
        ));

        return response()->json(['data' => [
            'uuid' => $verification->uuid,
            'status' => $verification->status?->value,
            'requested_at' => $verification->requested_at?->toIso8601String(),
        ]], 201);
    }

    /**
     * PUBLIC secure response endpoint — previous employer answers via the
     * token link sent in their notification. No account required.
     */
    public function respondByToken(Request $request, string $token, EmploymentService $service, NotificationService $notifications): JsonResponse
    {
        $verification = EmploymentVerification::where('token', $token)->firstOrFail();
        abort_unless($verification->status === EmploymentVerificationResponse::Pending, 422, 'This request has already been answered.');

        $data = $request->validate([
            'response' => ['required', 'in:confirmed,unable_to_confirm,disputed'],
            'job_role' => ['nullable', 'string', 'max:120'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'performance' => ['nullable', 'integer', 'between:1,5'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $service->respondToVerification(
            $verification,
            EmploymentVerificationResponse::from($data['response']),
            $data,
            null,
        );

        $record = $verification->employmentRecord;

        $notifications->send($record->helper, new PlatformNotification(
            type: 'employment_verified',
            title: $data['response'] === 'confirmed' ? 'Employment verified ✓' : 'Verification response received',
            body: $data['response'] === 'confirmed'
                ? "Your previous employment as {$record->job_role} has been verified and added to your public history."
                : "A previous employer responded to the verification request for your role as {$record->job_role}. Our team will review it.",
        ));

        AuditLogService::log('employment_verification.token_response', $verification, null, ['response' => $data['response']]);

        return response()->json(['message' => 'Thank you. Your response has been recorded.']);
    }

    public function verifyToken(string $token): JsonResponse
    {
        $verification = EmploymentVerification::where('token', $token)->firstOrFail();

        return response()->json([
            'data' => [
                'status' => $verification->status?->value,
                'helper_name' => $verification->employmentRecord->helper->full_name,
                'job_role' => $verification->employmentRecord->job_role,
                'start_date' => $verification->employmentRecord->start_date?->toDateString(),
                'end_date' => $verification->employmentRecord->end_date?->toDateString(),
            ],
        ]);
    }
}
