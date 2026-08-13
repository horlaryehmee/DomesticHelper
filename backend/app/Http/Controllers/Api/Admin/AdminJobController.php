<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\JobResource;
use App\Models\Job;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminJobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $jobs = Job::query()
            ->with(['employer.employerProfile'])
            ->withCount('applications')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('q'), fn ($q, $s) => $q->whereRaw('LOWER(title) LIKE ?', ['%'.mb_strtolower($s).'%']))
            ->latest()
            ->paginate(15);

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

    /** Moderate a reported job. */
    public function moderate(Request $request, Job $job): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:active,closed,reported']]);

        $job->forceFill(['status' => JobStatus::from($data['status'])])->save();

        AuditLogService::log('job.admin_moderated', $job, null, ['status' => $data['status']]);

        return response()->json(['data' => new JobResource($job->fresh()->load('employer.employerProfile'))]);
    }
}
