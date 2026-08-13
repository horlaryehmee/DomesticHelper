<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ReportOutcome;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Services\NotificationService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class AdminReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reports = Report::query()
            ->with(['helper', 'reporter', 'employmentRecord', 'evidence'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('outcome'), fn ($q, $o) => $q->where('outcome', $o))
            ->when($request->input('category'), fn ($q, $c) => $q->where('category', $c))
            ->latest()
            ->paginate(15);

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

    public function show(Report $report): JsonResponse
    {
        return response()->json(['data' => new ReportResource($report->load(['helper', 'reporter', 'employmentRecord', 'evidence', 'responses.user']))]);
    }

    /**
     * The admin decision. Only 'verified' outcomes touch the trust score,
     * via TrustScoreService. Every decision is audited.
     */
    public function decide(Request $request, Report $report, ReportService $reports, NotificationService $notifications): JsonResponse
    {
        $this->authorize('decide', Report::class);

        $data = $request->validate([
            'outcome' => ['required', 'in:unsubstantiated,resolved,verified,dismissed,partially_verified,escalated'],
            'decision' => ['required', 'string', 'min:10', 'max:3000'],
        ]);

        $reports->decide($report, ReportOutcome::from($data['outcome']), $request->user(), $data['decision']);

        $scoreImpact = $data['outcome'] === 'verified' ? 'This outcome has been reflected in your trust score.' : 'No change has been made to your trust score.';

        $notifications->send($report->helper, new PlatformNotification(
            type: 'report_decided',
            title: 'Report review completed',
            body: "A report concerning you has been reviewed and marked \"".ReportOutcome::from($data['outcome'])->label()."\". {$scoreImpact}",
        ));

        $notifications->send($report->reporter, new PlatformNotification(
            type: 'report_decided',
            title: 'Report review completed',
            body: "Your report has been reviewed and marked \"".ReportOutcome::from($data['outcome'])->label()."\".",
        ));

        return response()->json(['data' => new ReportResource($report->fresh()->load(['helper', 'reporter', 'employmentRecord', 'evidence']))]);
    }
}
