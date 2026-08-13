<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->with(['user', 'payable'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('provider'), fn ($q, $p) => $q->where('provider', $p))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $payments->through(fn ($p) => [
                ...(new PaymentResource($p))->resolve(),
                'payer' => $p->user ? ['uuid' => $p->user->uuid, 'name' => $p->user->full_name] : null,
            ]),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
                'revenue' => Payment::where('status', 'successful')->sum('amount') / 100,
            ],
        ]);
    }

    public function refund(Request $request, Payment $payment, PaymentService $payments): JsonResponse
    {
        $this->authorize('refund', Payment::class);

        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $refunded = $payments->refund($payment, $data['reason'] ?? null);

        return response()->json(['data' => ['refunded' => $refunded]]);
    }
}
