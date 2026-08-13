<?php

namespace App\Models;

use App\Enums\DisputeStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Dispute extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'helper_id', 'disputable_type', 'disputable_id',
        'reason', 'explanation', 'status', 'resolution_decision',
        'resolution_reason', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => DisputeStatus::class,
            'resolved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Dispute $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function disputable(): MorphTo
    {
        return $this->morphTo();
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function evidence(): MorphMany
    {
        return $this->morphMany(Evidence::class, 'evidenceable');
    }
}
