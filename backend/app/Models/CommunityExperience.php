<?php

namespace App\Models;

use App\Models\Concerns\RoutesByUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CommunityExperience extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'content_type', 'title', 'description', 'category', 'subject_name',
        'location', 'incident_date', 'source_url', 'submitter_name', 'submitter_email',
        'submitter_phone', 'status', 'verification_level', 'moderation_note',
        'moderated_by', 'moderated_at', 'published_at',
    ];

    protected static function booted(): void
    {
        static::creating(fn (self $item) => $item->uuid ??= (string) Str::uuid());
    }

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'moderated_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    public function media(): HasMany
    {
        return $this->hasMany(CommunityExperienceMedia::class)->orderBy('position');
    }
}
