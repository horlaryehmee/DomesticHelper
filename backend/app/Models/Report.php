<?php

namespace App\Models;

use App\Enums\ReportCategory;
use App\Enums\ReportOutcome;
use App\Enums\ReportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Report extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'helper_id', 'reporter_id', 'employment_record_id',
        'category', 'description', 'status', 'outcome', 'helper_response',
        'admin_decision', 'decided_by', 'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'category' => ReportCategory::class,
            'status' => ReportStatus::class,
            'outcome' => ReportOutcome::class,
            'decided_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Report $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function employmentRecord(): BelongsTo
    {
        return $this->belongsTo(EmploymentRecord::class);
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function evidence(): MorphMany
    {
        return $this->morphMany(Evidence::class, 'evidenceable');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(ReportResponse::class);
    }

    public function disputes(): MorphMany
    {
        return $this->morphMany(Dispute::class, 'disputable');
    }
}
