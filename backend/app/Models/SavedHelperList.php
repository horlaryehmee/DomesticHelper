<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedHelperList extends Model
{
    protected $fillable = ['employer_id', 'name'];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function savedHelpers(): HasMany
    {
        return $this->hasMany(SavedHelper::class, 'list_id');
    }
}
