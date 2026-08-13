<?php

namespace App\Models;

use App\Enums\EmploymentVerificationResponse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EmploymentVerification extends Model
{
    protected $fillable = [
        'uuid', 'employment_record_id', 'requested_by', 'token', 'status',
        'confirmed_job_role', 'confirmed_start_date', 'confirmed_end_date',
        'confirmed_performance', 'response_notes', 'responded_by',
        'requested_at', 'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => EmploymentVerificationResponse::class,
            'confirmed_start_date' => 'date',
            'confirmed_end_date' => 'date',
            'confirmed_performance' => 'integer',
            'requested_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (EmploymentVerification $model) {
            $model->uuid ??= (string) Str::uuid();
            $model->token ??= Str::random(64);
        });
    }

    public function employmentRecord(): BelongsTo
    {
        return $this->belongsTo(EmploymentRecord::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function respondedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }
}
