<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrustScoreRule extends Model
{
    protected $fillable = [
        'slug', 'name', 'event_type', 'description', 'points', 'active',
    ];

    protected function casts(): array
    {
        return ['points' => 'integer', 'active' => 'boolean'];
    }
}
