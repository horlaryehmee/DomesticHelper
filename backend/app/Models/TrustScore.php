<?php

namespace App\Models;

use App\Enums\TrustCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrustScore extends Model
{
    protected $fillable = [
        'helper_id', 'score', 'category', 'events_count', 'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'category' => TrustCategory::class,
            'events_count' => 'integer',
            'calculated_at' => 'datetime',
        ];
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }
}
