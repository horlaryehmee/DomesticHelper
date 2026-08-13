<?php

namespace App\Services\Payments;

readonly class WebhookResult
{
    public function __construct(
        public bool $verified,
        public ?string $event = null,
        public ?string $reference = null,
        public array $raw = [],
    ) {
    }
}
