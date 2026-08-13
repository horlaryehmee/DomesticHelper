<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Evidence extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'evidenceable_type', 'evidenceable_id', 'uploader_id',
        'original_name', 'path', 'mime_type', 'size', 'sha256',
    ];

    protected $hidden = ['path']; // never expose storage paths

    protected static function booted(): void
    {
        static::creating(function (Evidence $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function evidenceable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }
}
