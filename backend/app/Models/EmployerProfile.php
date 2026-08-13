<?php

namespace App\Models;

use App\Enums\ProfileType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployerProfile extends Model
{
    protected $fillable = [
        'user_id', 'profile_type', 'agency_name', 'address_line',
        'city', 'state', 'bio', 'profile_completed',
    ];

    protected function casts(): array
    {
        return [
            'profile_type' => ProfileType::class,
            'profile_completed' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'employer_id', 'user_id');
    }
}
