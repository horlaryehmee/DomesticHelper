<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'provider' => $this->provider,
            'amount' => $this->amountInNaira(),
            'currency' => $this->currency,
            'status' => $this->status?->value,
            'channel' => $this->channel,
            'payable_type' => $this->payable_type ? class_basename($this->payable_type) : null,
            'payable' => $this->whenLoaded('payable', fn () => $this->payable ? ['uuid' => $this->payable->uuid] : null),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
