<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Events\PaymentSucceeded;
use App\Models\Payment;
use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Payment orchestration. Business logic never depends on a concrete
 * provider — gateways live behind PaymentGatewayInterface.
 */
class PaymentService
{
    public function gateway(string $provider): PaymentGatewayInterface
    {
        return match ($provider) {
            'paystack' => app(PaystackGateway::class),
            'flutterwave' => app(FlutterwaveGateway::class),
            'sandbox' => app(SandboxGateway::class),
            default => abort(422, "Unknown payment provider [{$provider}]."),
        };
    }

    public function defaultProvider(): string
    {
        if (config('services.paystack.secret_key')) {
            return 'paystack';
        }
        if (config('services.flutterwave.secret_key')) {
            return 'flutterwave';
        }
        return 'sandbox';
    }

    /**
     * Create a payment and initialize the checkout.
     */
    public function initialize(
        Model $payable,
        int $amountMinor,
        ?string $provider = null,
        array $meta = [],
    ): array {
        $provider ??= $this->defaultProvider();

        $payment = DB::transaction(function () use ($payable, $amountMinor, $provider, $meta) {
            $payment = Payment::create([
                'user_id' => request()->user()->id,
                'payable_type' => $payable->getMorphClass(),
                'payable_id' => $payable->getKey(),
                'provider' => $provider,
                'amount' => $amountMinor,
                'currency' => 'NGN',
                'status' => PaymentStatus::Pending,
                'metadata' => $meta,
            ]);

            AuditLogService::log('payment.initialized', $payment);

            return $payment;
        });

        $result = $this->gateway($provider)->initializePayment($payment, $meta);

        $payment->forceFill([
            'provider_reference' => $result['provider_reference'],
            'provider_payload' => ['initialize' => $result],
        ])->save();

        return [
            'payment' => $payment,
            'authorization_url' => $result['authorization_url'],
        ];
    }

    /**
     * Server-side verification via the provider API (never frontend).
     */
    public function verify(Payment $payment): Payment
    {
        $result = $this->gateway($payment->provider)->verifyPayment((string) $payment->provider_reference);

        if (! $result->success) {
            if ($payment->status === PaymentStatus::Pending) {
                $payment->forceFill(['status' => PaymentStatus::Failed])->save();
            }
            return $payment;
        }

        return $this->markSuccessful($payment, [
            'channel' => $result->channel,
            'amount_paid' => $result->amountPaid,
            'currency' => $result->currency,
            'paid_at' => $result->paidAt,
            'raw' => $result->raw,
        ]);
    }

    /**
     * Webhook entrypoint — verifies the signature with the gateway first.
     */
    public function handleWebhook(string $provider, array $payload, array $headers): bool
    {
        $result = $this->gateway($provider)->handleWebhook($payload, $headers);

        if (! $result->verified) {
            AuditLogService::log('payment.webhook_rejected', "payment/{$provider}");
            return false;
        }

        if (! $result->reference) {
            return true;
        }

        $payment = Payment::query()->where('provider_reference', $result->reference)->first();
        if (! $payment) {
            return true; // unknown reference — ack to stop retries
        }

        if (in_array($result->event, ['charge.success', 'charge.completed', 'charge', 'payment.completed'], true)) {
            $this->markSuccessful($payment, ['raw' => $result->raw]);
        } elseif (in_array($result->event, ['refund.processed', 'refund.completed', 'payment.refunded'], true)) {
            $payment->forceFill(['status' => PaymentStatus::Refunded])->save();
            AuditLogService::log('payment.refunded', $payment);
        }

        return true;
    }

    /**
     * Idempotent success transition. Fires PaymentSucceeded once per payment.
     */
    public function markSuccessful(Payment $payment, array $providerData = []): Payment
    {
        if ($payment->status === PaymentStatus::Successful) {
            return $payment;
        }

        DB::transaction(function () use ($payment, $providerData) {
            $payment->forceFill([
                'status' => PaymentStatus::Successful,
                'channel' => $providerData['channel'] ?? $payment->channel,
                'provider_payload' => array_merge($payment->provider_payload ?? [], $providerData),
                'paid_at' => now(),
            ])->save();

            AuditLogService::log('payment.successful', $payment);
        });

        event(new PaymentSucceeded($payment));

        return $payment;
    }

    public function refund(Payment $payment, ?string $reason = null): bool
    {
        abort_unless($payment->status === PaymentStatus::Successful, 422, 'Only successful payments can be refunded.');

        $refunded = $this->gateway($payment->provider)->refund($payment, $reason);

        if ($refunded) {
            $payment->forceFill(['status' => PaymentStatus::Refunded])->save();
            AuditLogService::log('payment.refunded', $payment, null, ['reason' => $reason]);
        }

        return $refunded;
    }
}
