<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FlutterwaveGateway implements PaymentGatewayInterface
{
    private function baseUrl(): string
    {
        return 'https://api.flutterwave.com/v3';
    }

    private function secretKey(): string
    {
        return (string) config('services.flutterwave.secret_key');
    }

    public function initializePayment(Payment $payment, array $meta = []): array
    {
        $user = $payment->user;

        $response = Http::withToken($this->secretKey())
            ->post($this->baseUrl().'/payments', [
                'tx_ref' => $payment->uuid,
                'amount' => $payment->amountInNaira(),
                'currency' => $payment->currency,
                'redirect_url' => rtrim((string) config('app.frontend_url'), '/').'/payments/callback',
                'customer' => [
                    'email' => $user->email ?? 'user+'.$user->id.'@domestichelper.test',
                    'name' => $user->full_name,
                ],
                'meta' => array_merge($meta, ['payment_uuid' => $payment->uuid]),
            ])->throw()->json();

        abort_unless(($response['status'] ?? '') === 'success', 502, 'Flutterwave initialization failed.');

        return [
            'provider_reference' => $response['data']['tx_ref'],
            'authorization_url' => $response['data']['link'],
        ];
    }

    public function verifyPayment(string $reference): PaymentVerificationResult
    {
        $response = Http::withToken($this->secretKey())
            ->get($this->baseUrl()."/transactions/verify_by_reference?tx_ref={$reference}")
            ->json();

        $data = $response['data'] ?? [];
        $success = ($response['status'] ?? '') === 'success'
            && ($data['status'] ?? '') === 'successful';

        return new PaymentVerificationResult(
            success: $success,
            reference: $data['tx_ref'] ?? $reference,
            amountPaid: $data['amount'] ?? null,
            currency: $data['currency'] ?? null,
            channel: $data['payment_type'] ?? null,
            paidAt: $data['created_at'] ?? null,
            raw: $response,
        );
    }

    public function handleWebhook(array $payload, array $headers): WebhookResult
    {
        $hash = $headers['verif-hash'] ?? '';

        if (! $hash || ! hash_equals($hash, (string) config('services.flutterwave.webhook_hash'))) {
            return new WebhookResult(verified: false);
        }

        return new WebhookResult(
            verified: true,
            event: $payload['event'] ?? null,
            reference: $payload['data']['tx_ref'] ?? null,
            raw: $payload,
        );
    }

    public function refund(Payment $payment, ?string $reason = null): bool
    {
        $response = Http::withToken($this->secretKey())
            ->post($this->baseUrl()."/transactions/{$payment->provider_reference}/refund", [
                'amount' => $payment->amountInNaira(),
            ])->json();

        Log::info('Flutterwave refund attempt', ['payment' => $payment->uuid, 'response' => $response]);

        return ($response['status'] ?? '') === 'success';
    }
}
