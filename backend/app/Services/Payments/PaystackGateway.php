<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackGateway implements PaymentGatewayInterface
{
    private function baseUrl(): string
    {
        return 'https://api.paystack.co';
    }

    private function secretKey(): string
    {
        return (string) config('services.paystack.secret_key');
    }

    public function initializePayment(Payment $payment, array $meta = []): array
    {
        $user = $payment->user;

        $response = Http::withToken($this->secretKey())
            ->post($this->baseUrl().'/transaction/initialize', [
                'email' => $user->email ?? 'user+'.$user->id.'@domestichelper.test',
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'reference' => $payment->uuid,
                'metadata' => array_merge($meta, ['payment_uuid' => $payment->uuid]),
            ])->throw()->json();

        abort_unless(($response['status'] ?? false) === true, 502, 'Paystack initialization failed.');

        return [
            'provider_reference' => $response['data']['reference'],
            'authorization_url' => $response['data']['authorization_url'],
        ];
    }

    public function verifyPayment(string $reference): PaymentVerificationResult
    {
        $response = Http::withToken($this->secretKey())
            ->get($this->baseUrl()."/transaction/verify/{$reference}")
            ->json();

        $data = $response['data'] ?? [];
        $success = ($response['status'] ?? false) === true
            && ($data['status'] ?? '') === 'success';

        return new PaymentVerificationResult(
            success: $success,
            reference: $data['reference'] ?? $reference,
            amountPaid: $data['amount'] ?? null,
            currency: $data['currency'] ?? null,
            channel: $data['channel'] ?? null,
            paidAt: $data['paid_at'] ?? null,
            raw: $response,
        );
    }

    public function handleWebhook(array $payload, array $headers): WebhookResult
    {
        $signature = $headers['x-paystack-signature'] ?? '';

        if (! $signature || ! hash_equals($signature, hash_hmac('sha512', (string) request()->getContent(), $this->secretKey()))) {
            return new WebhookResult(verified: false);
        }

        return new WebhookResult(
            verified: true,
            event: $payload['event'] ?? null,
            reference: $payload['data']['reference'] ?? null,
            raw: $payload,
        );
    }

    public function refund(Payment $payment, ?string $reason = null): bool
    {
        $response = Http::withToken($this->secretKey())
            ->post($this->baseUrl().'/refund', [
                'transaction' => $payment->provider_reference,
                'merchant_note' => $reason ?? 'Refund',
            ])->json();

        Log::info('Paystack refund attempt', ['payment' => $payment->uuid, 'response' => $response]);

        return ($response['status'] ?? false) === true;
    }
}
