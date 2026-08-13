<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class JobApplication extends Model
{
    use RoutesByUuid;

    protected $fillable = ['uuid', 'job_id', 'helper_id', 'status', 'cover_note'];

    protected function casts(): array
    {
        return ['status' => ApplicationStatus::class];
    }

    protected static function booted(): void
    {
        static::creating(function (JobApplication $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }
}
