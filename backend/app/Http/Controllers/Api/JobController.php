<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobResource;
use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    /**
     * Public job board.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Job::query()
            ->active()
            ->with(['employer.employerProfile', 'applications' => fn ($q) => $q->where('helper_id', $request->user()?->id)]);

        if ($q = $request->input('q')) {
            $query->where(function ($b) use ($q) {
                $b->whereRaw('LOWER(title) LIKE ?', ['%'.mb_strtolower($q).'%'])
                    ->orWhereRaw('LOWER(work_type) LIKE ?', ['%'.mb_strtolower($q).'%'])
                    ->orWhereRaw('LOWER(description) LIKE ?', ['%'.mb_strtolower($q).'%']);
            });
        }
        if ($state = $request->input('state')) {
            $query->where('state', $state);
        }
        if ($city = $request->input('city')) {
            $query->where('city', $city);
        }
        if ($workType = $request->input('work_type')) {
            $query->where('work_type', $workType);
        }
        if ($employmentType = $request->input('employment_type')) {
            $query->where('employment_type', $employmentType);
        }
        if ($min = $request->input('salary_min')) {
            $query->where(fn ($q) => $q->whereNull('salary_max')->orWhere('salary_max', '>=', $min));
        }
        if ($max = $request->input('salary_max')) {
            $query->where(fn ($q) => $q->whereNull('salary_min')->orWhere('salary_min', '<=', $max));
        }

        $sort = $request->input('sort', 'latest');
        $query->when($sort === 'oldest', fn ($q) => $q->oldest())->latest();

        $jobs = $query->withCount('applications')->paginate(12);

        return response()->json([
            'data' => JobResource::collection($jobs),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
                'from' => $jobs->firstItem(),
                'to' => $jobs->lastItem(),
            ],
        ]);
    }

    public function show(Request $request, Job $job): JsonResponse
    {
        $this->authorize('view', $job);

        $job->load([
            'employer.employerProfile',
            'applications' => fn ($q) => $q->where('helper_id', $request->user()?->id),
        ])->loadCount('applications');

        return response()->json(['data' => new JobResource($job)]);
    }
}
