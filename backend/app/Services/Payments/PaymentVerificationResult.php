<?php

namespace App\Services\Payments;

readonly class PaymentVerificationResult
{
    public function __construct(
        public bool $success,
        public string $reference,
        public ?int $amountPaid = null,
        public ?string $currency = null,
        public ?string $channel = null,
        public ?string $paidAt = null,
        public array $raw = [],
    ) {
    }
}
