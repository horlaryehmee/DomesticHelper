<?php

namespace App\Models;

use App\Enums\UserStatus;
use App\Enums\UserType;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use RoutesByUuid;

    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'uuid', 'first_name', 'last_name', 'email', 'phone', 'password',
        'user_type', 'status', 'avatar_path', 'phone_verified_at',
        'email_verified_at', 'last_active_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_active_at' => 'datetime',
            'password' => 'hashed',
            'user_type' => UserType::class,
            'status' => UserStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            $user->uuid ??= (string) Str::uuid();
        });
    }

    public function fullName(): Attribute
    {
        return Attribute::get(fn () => trim("{$this->first_name} {$this->last_name}"));
    }

    public function employerProfile(): HasOne
    {
        return $this->hasOne(EmployerProfile::class);
    }

    public function helperProfile(): HasOne
    {
        return $this->hasOne(HelperProfile::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function otps(): HasMany
    {
        return $this->hasMany(Otp::class);
    }

    public function identityVerifications(): HasMany
    {
        return $this->hasMany(IdentityVerification::class);
    }

    public function employmentRecordsAsEmployer(): HasMany
    {
        return $this->hasMany(EmploymentRecord::class, 'employer_id');
    }

    public function employmentRecordsAsHelper(): HasMany
    {
        return $this->hasMany(EmploymentRecord::class, 'helper_id');
    }

    public function reviewsReceived(): HasMany
    {
        return $this->hasMany(Review::class, 'helper_id');
    }

    public function reviewsWritten(): HasMany
    {
        return $this->hasMany(Review::class, 'employer_id');
    }

    public function reportsAsHelper(): HasMany
    {
        return $this->hasMany(Report::class, 'helper_id');
    }

    public function reportsAsReporter(): HasMany
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    public function referenceChecks(): HasMany
    {
        return $this->hasMany(ReferenceCheck::class, 'helper_id');
    }

    public function trustScoreEvents(): HasMany
    {
        return $this->hasMany(TrustScoreEvent::class, 'helper_id');
    }

    public function trustScore(): HasOne
    {
        return $this->hasOne(TrustScore::class, 'helper_id');
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'employer_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class, 'helper_id');
    }

    public function savedBy(): HasMany
    {
        return $this->hasMany(SavedHelper::class, 'helper_id');
    }

    public function isAdmin(): bool
    {
        return $this->user_type === UserType::Admin;
    }

    public function isEmployer(): bool
    {
        return $this->user_type === UserType::Employer;
    }

    public function isHelper(): bool
    {
        return $this->user_type === UserType::Helper;
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()
            ->whereHas('permissions', fn ($q) => $q->where('slug', $permission))
            ->exists();
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('slug', $role)->exists();
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()->whereIn('slug', $roles)->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }

    /**
     * Touch last_active_at for "recently active" sorting in search.
     */
    public function touchActivity(): void
    {
        if (! $this->last_active_at || $this->last_active_at->diffInMinutes(now()) >= 15) {
            $this->forceFill(['last_active_at' => now()])->save();
        }
    }
}
