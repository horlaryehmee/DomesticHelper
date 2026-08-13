<?php

namespace App\Models;

use App\Enums\VerificationReportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class VerificationReport extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'helper_id', 'purchased_by', 'payment_id',
        'status', 'snapshot', 'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => VerificationReportStatus::class,
            'snapshot' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (VerificationReport $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function purchaser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'purchased_by');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
