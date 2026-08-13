<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Skill extends Model
{
    protected $fillable = ['slug', 'name', 'category', 'description', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::creating(function (Skill $skill) {
            $skill->slug ??= Str::slug($skill->name);
        });
    }
}
