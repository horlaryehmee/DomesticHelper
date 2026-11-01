<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('approval_status')->default('approved')->index();
            $table->timestamp('details_confirmed_at')->nullable();
            $table->timestamp('onboarding_submitted_at')->nullable();
            $table->text('approval_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['approval_status', 'details_confirmed_at', 'onboarding_submitted_at', 'approval_notes']));
    }
};
