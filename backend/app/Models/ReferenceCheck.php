<?php

namespace App\Models;

use App\Enums\ReferenceCheckStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class ReferenceCheck extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'requested_by', 'helper_id', 'referee_name', 'referee_phone',
        'referee_email', 'relationship', 'employment_period', 'status',
        'worked_there', 'confirmed_role', 'duration_reported', 'performance_notes',
        'reason_for_leaving', 'would_rehire', 'additional_notes',
        'completed_by', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ReferenceCheckStatus::class,
            'worked_there' => 'boolean',
            'would_rehire' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ReferenceCheck $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
