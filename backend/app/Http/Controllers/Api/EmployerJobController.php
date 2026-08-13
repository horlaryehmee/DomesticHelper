<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJobRequest;
use App\Http\Resources\JobApplicationResource;
use App\Http\Resources\JobResource;
use App\Models\Job;
use App\Models\JobApplication;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class EmployerJobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $jobs = $request->user()->jobs()
            ->withCount('applications')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(10);

        return response()->json([
            'data' => JobResource::collection($jobs),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ]);
    }

    public function store(StoreJobRequest $request): JsonResponse
    {
        $data = $request->validated();

        $job = Job::create([
            ...collect($data)->except(['status'])->toArray(),
            'employer_id' => $request->user()->id,
            'status' => $data['status'] ?? JobStatus::Active,
            'expires_at' => now()->addDays(45),
        ]);

        AuditLogService::log('job.created', $job);

        return response()->json(['data' => new JobResource($job->load('employer.employerProfile'))], 201);
    }

    public function show(Request $request, Job $job): JsonResponse
    {
        abort_unless($job->employer_id === $request->user()->id, 403);

        $job->load(['employer.employerProfile'])->loadCount('applications');

        return response()->json(['data' => new JobResource($job)]);
    }

    public function update(StoreJobRequest $request, Job $job): JsonResponse
    {
        abort_unless($job->employer_id === $request->user()->id, 403);

        $job->update(collect($request->validated())->except(['status'])->toArray());

        AuditLogService::log('job.updated', $job);

        return response()->json(['data' => new JobResource($job->fresh()->load('employer.employerProfile'))]);
    }

    public function setStatus(Request $request, Job $job): JsonResponse
    {
        abort_unless($job->employer_id === $request->user()->id, 403);

        $data = $request->validate(['status' => ['required', 'in:active,closed,filled']]);
        $job->forceFill(['status' => $data['status']])->save();

        AuditLogService::log('job.status_changed', $job, null, ['status' => $data['status']]);

        return response()->json(['data' => new JobResource($job)]);
    }

    public function destroy(Job $job): JsonResponse
    {
        abort_unless($job->employer_id === request()->user()->id, 403);

        AuditLogService::log('job.deleted', $job);
        $job->delete();

        return response()->json(['message' => 'Job deleted.']);
    }

    /**
     * All applications across the employer's jobs.
     */
    public function applications(Request $request): JsonResponse
    {
        $applications = JobApplication::query()
            ->whereHas('job', fn ($q) => $q->where('employer_id', $request->user()->id))
            ->with(['job', 'helper.helperProfile.skills', 'helper.trustScore'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(15);

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

    public function jobApplications(Request $request, Job $job): JsonResponse
    {
        abort_unless($job->employer_id === $request->user()->id, 403);

        $applications = $job->applications()
            ->with(['helper.helperProfile.skills', 'helper.trustScore'])
            ->latest()
            ->paginate(15);

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

    public function setApplicationStatus(Request $request, JobApplication $application, NotificationService $notifications): JsonResponse
    {
        abort_unless($application->job->employer_id === $request->user()->id, 403);

        $data = $request->validate(['status' => ['required', 'in:shortlisted,rejected,interview,hired']]);
        $application->forceFill(['status' => $data['status']])->save();

        AuditLogService::log('job_application.status_changed', $application, null, ['status' => $data['status']]);

        $labels = [
            'shortlisted' => ['You have been shortlisted', "The employer shortlisted you for \"{$application->job->title}\"."],
            'rejected' => ['Application update', "Your application for \"{$application->job->title}\" was not successful this time."],
            'interview' => ['Interview stage', "You have moved to the interview stage for \"{$application->job->title}\"."],
            'hired' => ['Congratulations!', "You have been hired for \"{$application->job->title}\". The employer will confirm your employment details."],
        ];

        $notifications->send($application->helper, new PlatformNotification(
            type: 'application_'.$data['status'],
            title: $labels[$data['status']][0],
            body: $labels[$data['status']][1],
        ));

        return response()->json(['data' => new JobApplicationResource($application->load(['job', 'helper.helperProfile.skills', 'helper.trustScore']))]);
    }
}
