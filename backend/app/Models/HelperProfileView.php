<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HelperProfileView extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['helper_id', 'viewer_id'];

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }
}
