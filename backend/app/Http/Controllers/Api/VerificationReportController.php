<?php

namespace App\Http\Controllers\Api;

use App\Enums\VerificationReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseVerificationReportRequest;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\VerificationReportResource;
use App\Models\Setting;
use App\Models\VerificationReport;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerificationReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reports = VerificationReport::where('purchased_by', $request->user()->id)
            ->with('helper')
            ->latest()
            ->paginate(12);

        return response()->json([
            'data' => VerificationReportResource::collection($reports),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    /**
     * Step 3-4 of the hiring flow: purchase → pay → generate report.
     * The report is generated only after server-verified payment.
     */
    public function purchase(PurchaseVerificationReportRequest $request, PaymentService $payments): JsonResponse
    {
        $this->authorize('purchase', VerificationReport::class);

        $helper = User::where('uuid', $request->input('helper_uuid'))->firstOrFail();
        abort_unless($helper->isHelper(), 422);

        $price = (int) Setting::getValue('verification_report_price', 5000);

        $report = VerificationReport::create([
            'helper_id' => $helper->id,
            'purchased_by' => $request->user()->id,
            'status' => VerificationReportStatus::PendingPayment,
        ]);

        $result = $payments->initialize($report, $price * 100, $request->input('provider'));

        $report->forceFill(['payment_id' => $result['payment']->id])->save();

        AuditLogService::log('verification_report.purchase_initiated', $report);

        return response()->json([
            'data' => [
                'report' => new VerificationReportResource($report->load('helper')),
                'payment' => new PaymentResource($result['payment']),
                'authorization_url' => $result['authorization_url'],
            ],
        ], 201);
    }

    public function show(Request $request, VerificationReport $report): JsonResponse
    {
        $this->authorize('view', $report);

        return response()->json(['data' => new VerificationReportResource($report->load('helper'))]);
    }
}
