<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Helper skills and job categories may share names (e.g. "Nanny") —
        // uniqueness is per (slug, category), not global slug.
        Schema::table('skills', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['slug', 'category']);
        });
    }

    public function down(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->dropUnique(['slug', 'category']);
            $table->unique('slug');
        });
    }
};
