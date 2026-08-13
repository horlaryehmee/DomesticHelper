<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ApplyJobRequest;
use App\Http\Resources\JobApplicationResource;
use App\Models\Job;
use App\Models\JobApplication;
use App\Models\SavedJob;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class HelperApplicationController extends Controller
{
    /** Applications for the current helper. */
    public function index(Request $request): JsonResponse
    {
        $applications = $request->user()
            ->applications()
            ->with(['job.employer.employerProfile'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(12);

        return response()->json([
            'data' => JobApplicationResource::collection($applications),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ]);
    }

    public function apply(ApplyJobRequest $request, Job $job, NotificationService $notifications): JsonResponse
    {
        $this->authorize('apply', $job);

        $helper = $request->user();

        $existing = JobApplication::where('job_id', $job->id)->where('helper_id', $helper->id)->first();
        if ($existing) {
            abort(422, 'You have already applied for this job.');
        }

        $application = JobApplication::create([
            'job_id' => $job->id,
            'helper_id' => $helper->id,
            'cover_note' => $request->input('cover_note'),
            'status' => ApplicationStatus::Applied,
        ]);

        AuditLogService::log('job_application.submitted', $application);

        $notifications->send($job->employer, new PlatformNotification(
            type: 'job_application',
            title: 'New job application',
            body: "{$helper->full_name} applied for \"{$job->title}\".",
        ));

        return response()->json(['data' => new JobApplicationResource($application->load(['job', 'helper.helperProfile.skills']))], 201);
    }

    public function withdraw(Request $request, JobApplication $application): JsonResponse
    {
        abort_unless($application->helper_id === $request->user()->id, 403);
        abort_unless($application->status === ApplicationStatus::Applied, 422, 'This application can no longer be withdrawn.');

        $application->forceFill(['status' => ApplicationStatus::Withdrawn])->save();

        AuditLogService::log('job_application.withdrawn', $application);

        return response()->json(['data' => new JobApplicationResource($application->load('job'))]);
    }

    /** Saved jobs for the helper. */
    public function savedJobs(): JsonResponse
    {
        $saved = SavedJob::where('helper_id', request()->user()->id)
            ->with('job.employer.employerProfile')
            ->latest()
            ->get();

        return response()->json(['data' => $saved->map(fn ($s) => $s->job)]);
    }

    public function saveJob(Request $request, Job $job): JsonResponse
    {
        $this->authorize('view', $job);

        SavedJob::firstOrCreate([
            'helper_id' => $request->user()->id,
            'job_id' => $job->id,
        ]);

        return response()->json(['data' => ['saved' => true]], 201);
    }

    public function unsaveJob(Request $request, Job $job): JsonResponse
    {
        SavedJob::where('helper_id', $request->user()->id)->where('job_id', $job->id)->delete();

        return response()->json(['data' => ['saved' => false]]);
    }
}
