<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Review extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'helper_id', 'employer_id', 'employment_record_id',
        'rating', 'work_type', 'duration_worked', 'feedback', 'status',
        'moderated_by', 'moderated_at', 'moderation_note',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'status' => ReviewStatus::class,
            'moderated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Review $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function employmentRecord(): BelongsTo
    {
        return $this->belongsTo(EmploymentRecord::class);
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(ReviewResponse::class);
    }

    public function disputes(): MorphMany
    {
        return $this->morphMany(Dispute::class, 'disputable');
    }
}
