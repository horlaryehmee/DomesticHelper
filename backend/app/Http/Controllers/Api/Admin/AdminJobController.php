<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJobRequest;
use App\Http\Resources\JobResource;
use App\Models\Job;
use App\Models\User;
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([...(new StoreJobRequest)->rules(), 'employer_uuid' => ['required', 'uuid']]);
        $employer = User::where('uuid', $data['employer_uuid'])->where('user_type', 'employer')->where('status', 'active')->where('approval_status', 'approved')->firstOrFail();
        $job = Job::create([...collect($data)->except(['employer_uuid', 'status'])->all(), 'employer_id' => $employer->id, 'status' => $data['status'] ?? 'draft', 'expires_at' => now()->addDays(45)]);
        AuditLogService::log('job.admin_created', $job);

        return response()->json(['data' => new JobResource($job->load('employer.employerProfile'))], 201);
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
