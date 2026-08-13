<?php

namespace App\Models;

use App\Enums\Availability;
use App\Enums\EmploymentType;
use App\Enums\Gender;
use App\Enums\HelperVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class HelperProfile extends Model
{
    protected $fillable = [
        'user_id', 'date_of_birth', 'gender', 'state', 'city', 'address_line',
        'nin_encrypted', 'nin_hash', 'nin_last4', 'photo_path', 'bio', 'years_experience',
        'availability', 'employment_type', 'expected_salary_min', 'expected_salary_max',
        'is_public', 'verification_status', 'profile_completed',
    ];

    protected $hidden = ['nin_encrypted', 'nin_hash', 'address_line'];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'gender' => Gender::class,
            'availability' => Availability::class,
            'employment_type' => EmploymentType::class,
            'verification_status' => HelperVerificationStatus::class,
            'is_public' => 'boolean',
            'profile_completed' => 'boolean',
            'years_experience' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'helper_skill')
            ->withPivot('years')
            ->withTimestamps();
    }

    public function trustScore(): HasOne
    {
        return $this->hasOne(TrustScore::class, 'helper_id', 'user_id');
    }
}
