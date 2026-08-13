<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\AuditLogService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * Provider webhooks (Paystack / Flutterwave). Signature is verified by
     * the gateway BEFORE any state changes. Never trusts the frontend.
     */
    public function webhook(Request $request, string $provider, PaymentService $payments): JsonResponse
    {
        // Flatten headers for the gateway signature check.
        $headers = collect($request->headers->all())
            ->mapWithKeys(fn ($value, $key) => [strtolower($key) => is_array($value) ? ($value[0] ?? '') : (string) $value])
            ->all();

        $handled = $payments->handleWebhook($provider, $request->all(), $headers);

        return response()->json(['received' => $handled], $handled ? 200 : 401);
    }

    /** Server-side re-verification (e.g. user returns from checkout). */
    public function verify(Request $request, Payment $payment, PaymentService $payments): JsonResponse
    {
        abort_unless($payment->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        $payment = $payments->verify($payment);

        return response()->json(['data' => new PaymentResource($payment)]);
    }

    public function index(Request $request): JsonResponse
    {
        $payments = Payment::where('user_id', $request->user()->id)
            ->with('payable')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => PaymentResource::collection($payments),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * DEBUG-ONLY sandbox payment simulation. Refuses to run outside debug.
     */
    public function simulateSandbox(Request $request, Payment $payment, PaymentService $payments): JsonResponse
    {
        abort_unless(config('app.debug'), 404, 'Sandbox simulation is disabled outside development.');
        abort_unless($payment->provider === 'sandbox', 422, 'This payment was not made via the sandbox gateway.');
        abort_unless($payment->user_id === $request->user()->id, 403);

        $payment = $payments->markSuccessful($payment, ['channel' => 'sandbox']);

        AuditLogService::log('payment.sandbox_simulated', $payment);

        return response()->json(['data' => new PaymentResource($payment)]);
    }
}
