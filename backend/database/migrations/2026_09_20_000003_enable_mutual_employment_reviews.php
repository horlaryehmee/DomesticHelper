<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->index('employment_record_id', 'reviews_employment_record_fk_idx');
            $table->dropUnique('reviews_employment_record_id_unique');
            $table->string('direction', 30)->default('employer_to_helper')->after('employment_record_id');
            $table->unique(['employment_record_id', 'direction'], 'reviews_employment_direction_unique');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique('reviews_employment_direction_unique');
            $table->dropColumn('direction');
            $table->dropIndex('reviews_employment_record_fk_idx');
            $table->unique('employment_record_id');
        });
    }
};
