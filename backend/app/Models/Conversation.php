<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Models\Concerns\RoutesByUuid;

class Conversation extends Model
{
    use RoutesByUuid;

    protected $fillable = [
        'uuid', 'employer_id', 'helper_id', 'job_id',
        'last_message_at', 'blocked_by',
    ];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (Conversation $model) {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function otherUser(User $user): User
    {
        return $user->id === $this->employer_id ? $this->helper : $this->employer;
    }
}
