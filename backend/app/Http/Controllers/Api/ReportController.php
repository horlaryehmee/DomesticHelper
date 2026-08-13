<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RespondReportRequest;
use App\Http\Requests\StoreReportRequest;
use App\Http\Resources\ReportResource;
use App\Models\EmploymentRecord;
use App\Models\Report;
use App\Models\User;
use App\Services\EvidenceService;
use App\Services\NotificationService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class ReportController extends Controller
{
    /** Reports where the current user is reporter or subject. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $reports = Report::query()
            ->where(fn ($q) => $q->where('reporter_id', $user->id)->orWhere('helper_id', $user->id))
            ->with(['helper', 'reporter', 'employmentRecord', 'evidence'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(12);

        return response()->json([
            'data' => ReportResource::collection($reports),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    /**
     * Employer submits a report. Submission NEVER affects the trust score.
     */
    public function store(StoreReportRequest $request, ReportService $reports, EvidenceService $evidence, NotificationService $notifications): JsonResponse
    {
        $this->authorize('create', Report::class);

        $helper = User::where('uuid', $request->input('helper_uuid'))->firstOrFail();
        abort_unless($helper->isHelper(), 422);

        $record = null;
        if ($uuid = $request->input('employment_record_uuid')) {
            $record = EmploymentRecord::where('uuid', $uuid)->firstOrFail();
            abort_unless($record->employer_id === $request->user()->id && $record->helper_id === $helper->id, 422, 'This employment record does not match the helper.');
        }

        $report = $reports->submit($request->user(), $helper, [
            'employment_record_id' => $record?->id,
            'category' => $request->input('category'),
            'description' => $request->input('description'),
        ]);

        foreach ($request->file('evidence', []) as $file) {
            $evidence->store($file, $report, $request->user());
        }

        // Business rule #5: the helper must be notified immediately.
        $notifications->send($helper, new PlatformNotification(
            type: 'report_submitted',
            title: 'A report has been submitted concerning you',
            body: 'An employer has submitted a report about their experience with you. You can view the details and respond from your dashboard. This does not affect your trust score unless it is verified by our team.',
        ));

        // Staff also see it in the moderation queue.
        $staff = User::query()->where('user_type', 'admin')->get();
        $notifications->sendToMany($staff, new PlatformNotification(
            type: 'report_new',
            title: 'New report submitted',
            body: "A new ".$report->category?->label()." report has been submitted for review.",
            sendEmail: false,
        ));

        return response()->json(['data' => new ReportResource($report->load(['helper', 'reporter', 'employmentRecord', 'evidence']))], 201);
    }

    public function show(Request $request, Report $report): JsonResponse
    {
        $this->authorize('view', $report);

        return response()->json(['data' => new ReportResource($report->load(['helper', 'reporter', 'employmentRecord', 'evidence']))]);
    }

    /** Helper's right of reply — never published, admin-reviewed. */
    public function respond(RespondReportRequest $request, Report $report, ReportService $reports, NotificationService $notifications): JsonResponse
    {
        $this->authorize('respond', $report);

        $reports->helperRespond($report, $request->user(), $request->input('response'));

        $notifications->send($report->reporter, new PlatformNotification(
            type: 'report_response',
            title: 'Response received',
            body: "The helper has responded to your report. Our team is reviewing the case.",
        ));

        return response()->json(['data' => new ReportResource($report->fresh()->load(['helper', 'reporter', 'employmentRecord', 'evidence']))]);
    }
}
