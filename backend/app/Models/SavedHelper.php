<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedHelper extends Model
{
    protected $fillable = ['employer_id', 'helper_id', 'list_id', 'note'];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_id');
    }

    public function list(): BelongsTo
    {
        return $this->belongsTo(SavedHelperList::class, 'list_id');
    }
}
