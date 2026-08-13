<?php

namespace App\Services\Payments;

use App\Models\Payment;

/**
 * Dev-only gateway used when no real provider keys are configured.
 * The "simulate success" flow is refused outside debug environments.
 */
class SandboxGateway implements PaymentGatewayInterface
{
    public function initializePayment(Payment $payment, array $meta = []): array
    {
        return [
            'provider_reference' => $payment->uuid,
            'authorization_url' => rtrim((string) config('app.frontend_url'), '/').'/payments/sandbox?payment='.$payment->uuid,
        ];
    }

    public function verifyPayment(string $reference): PaymentVerificationResult
    {
        // Never auto-verify in sandbox — payment stays pending until the
        // dev explicitly simulates success through the debug-only endpoint.
        return new PaymentVerificationResult(success: false, reference: $reference);
    }

    public function handleWebhook(array $payload, array $headers): WebhookResult
    {
        return new WebhookResult(verified: false);
    }

    public function refund(Payment $payment, ?string $reason = null): bool
    {
        return true;
    }
}
