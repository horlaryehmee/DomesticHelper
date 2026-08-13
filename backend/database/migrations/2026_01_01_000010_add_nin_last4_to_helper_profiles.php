<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->string('nin_last4', 4)->nullable()->after('nin_hash');
        });
    }

    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropColumn('nin_last4');
        });
    }
};
