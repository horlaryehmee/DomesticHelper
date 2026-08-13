<?php

namespace App\Models;

use App\Enums\IdentityVerificationStatus;
use App\Enums\IdentityVerificationType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class IdentityVerification extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'user_id', 'type', 'status', 'private_notes',
        'reviewed_by', 'reviewed_at', 'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => IdentityVerificationType::class,
            'status' => IdentityVerificationStatus::class,
            'reviewed_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (IdentityVerification $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function evidence(): MorphMany
    {
        return $this->morphMany(Evidence::class, 'evidenceable');
    }
}
