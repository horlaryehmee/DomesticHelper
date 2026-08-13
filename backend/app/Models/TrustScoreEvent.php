<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class TrustScoreEvent extends Model
{
    public const UPDATED_AT = null; // events are immutable

    protected $fillable = [
        'uuid', 'helper_id', 'rule_id', 'event_type', 'points',
        'source_type', 'source_id', 'note', 'created_by',
    ];

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (TrustScoreEvent $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(TrustScoreRule::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
