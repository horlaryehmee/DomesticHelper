<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Payment extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'user_id', 'payable_type', 'payable_id', 'provider',
        'provider_reference', 'amount', 'currency', 'status', 'channel',
        'provider_payload', 'metadata', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer', // minor units (kobo)
            'status' => PaymentStatus::class,
            'provider_payload' => 'array',
            'metadata' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Payment $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    public function amountInNaira(): float
    {
        return round($this->amount / 100, 2);
    }
}
