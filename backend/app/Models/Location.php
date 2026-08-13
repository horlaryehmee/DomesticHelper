<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Location extends Model
{
    protected $fillable = ['state', 'city', 'slug', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::creating(function (Location $location) {
            $location->slug ??= Str::slug("{$location->state} {$location->city}");
        });
    }
}
