<?php

namespace App\Models;

use App\Enums\EmploymentRecordStatus;
use App\Enums\EmploymentType;
use App\Enums\RecordVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class EmploymentRecord extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'employer_id', 'helper_id', 'job_role', 'start_date', 'end_date',
        'salary', 'employment_type', 'location', 'status', 'verification_status',
        'verified_by', 'verified_at', 'termination_reason', 'performance_rating',
        'private_notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'status' => EmploymentRecordStatus::class,
            'verification_status' => RecordVerificationStatus::class,
            'verified_at' => 'datetime',
            'employment_type' => EmploymentType::class,
            'performance_rating' => 'integer',
            'salary' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (EmploymentRecord $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function verifications(): HasMany
    {
        return $this->hasMany(EmploymentVerification::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function evidence(): MorphMany
    {
        return $this->morphMany(Evidence::class, 'evidenceable');
    }
}
