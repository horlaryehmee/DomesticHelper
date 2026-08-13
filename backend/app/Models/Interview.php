<?php

namespace App\Models;

use App\Enums\InterviewMode;
use App\Enums\InterviewStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Interview extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'job_id', 'employer_id', 'helper_id', 'mode',
        'scheduled_at', 'location', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'mode' => InterviewMode::class,
            'status' => InterviewStatus::class,
            'scheduled_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Interview $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }
}
