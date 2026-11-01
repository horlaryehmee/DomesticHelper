<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registration_verification_details', function (Blueprint $table) {
            $table->text('guarantor_2_name_encrypted')->nullable();
            $table->text('guarantor_2_phone_encrypted')->nullable();
            $table->text('guarantor_2_relationship_encrypted')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('registration_verification_details', fn (Blueprint $table) => $table->dropColumn(['guarantor_2_name_encrypted', 'guarantor_2_phone_encrypted', 'guarantor_2_relationship_encrypted']));
    }
};
