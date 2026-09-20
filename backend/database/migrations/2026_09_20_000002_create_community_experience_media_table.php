<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_experience_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_experience_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('mime_type', 100);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['community_experience_id', 'position'], 'community_media_order_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_experience_media');
    }
};
