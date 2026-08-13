<?php

namespace App\Services\Payments;

use App\Models\Payment;

interface PaymentGatewayInterface
{
    /**
     * Start a checkout with the provider.
     *
     * @return array{provider_reference: string, authorization_url: string}
     */
    public function initializePayment(Payment $payment, array $meta = []): array;

    /**
     * Server-side verification of a transaction by reference.
     */
    public function verifyPayment(string $reference): PaymentVerificationResult;

    /**
     * Handle a provider webhook. Implementations must verify the payload
     * signature before trusting ANY data.
     */
    public function handleWebhook(array $payload, array $headers): WebhookResult;

    public function refund(Payment $payment, ?string $reason = null): bool;
}
