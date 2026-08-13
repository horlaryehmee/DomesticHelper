<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with('user')
            ->when($request->input('action'), fn ($q, $a) => $q->where('action', 'like', "%{$a}%"))
            ->when($request->input('entity_type'), fn ($q, $t) => $q->where('entity_type', $t))
            ->when($request->input('user_uuid'), fn ($q, $u) => $q->whereHas('user', fn ($h) => $h->where('uuid', $u)))
            ->latest()
            ->paginate(30);

        return response()->json([
            'data' => AuditLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
