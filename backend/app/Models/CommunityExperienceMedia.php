<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityExperienceMedia extends Model
{
    protected $table = 'community_experience_media';
    protected $fillable = ['community_experience_id', 'path', 'mime_type', 'position'];

    public function experience(): BelongsTo
    {
        return $this->belongsTo(CommunityExperience::class, 'community_experience_id');
    }
}
