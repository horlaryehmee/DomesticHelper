<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->string('intro_video_path')->nullable()->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropColumn('intro_video_path');
        });
    }
};
