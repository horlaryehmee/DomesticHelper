<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'group', 'label'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        return Cache::rememberForever("setting:{$key}", function () use ($key, $default) {
            $setting = static::query()->where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    public static function setValue(string $key, mixed $value, ?string $group = 'general', ?string $label = null): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value, 'group' => $group, 'label' => $label],
        );
        Cache::forget("setting:{$key}");
    }
}
