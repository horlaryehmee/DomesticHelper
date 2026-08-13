<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use App\Services\AuditLogService;
use App\Services\EvidenceService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EvidenceController extends Controller
{
    /**
     * Authorized download from the private disk. There is no public URL.
     */
    public function download(Evidence $evidence, EvidenceService $service): BinaryFileResponse
    {
        $this->authorize('view', $evidence);

        AuditLogService::log('evidence.downloaded', $evidence);

        return $service->stream($evidence);
    }
}
