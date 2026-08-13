<?php

namespace App\Models;

use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Job extends Model
{
    use RoutesByUuid;

    protected $table = 'jobs';

    protected $fillable = [
        'uuid', 'employer_id', 'title', 'work_type', 'description',
        'responsibilities', 'requirements', 'salary_min', 'salary_max',
        'salary_type', 'location', 'state', 'city', 'working_hours',
        'accommodation_available', 'employment_type', 'start_date',
        'status', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'accommodation_available' => 'boolean',
            'start_date' => 'date',
            'expires_at' => 'datetime',
            'status' => JobStatus::class,
            'employment_type' => EmploymentType::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Job $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', JobStatus::Active)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}
