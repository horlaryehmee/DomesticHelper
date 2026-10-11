<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_verification_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('nin_encrypted');
            $table->string('nin_hash', 64)->unique();
            $table->string('nin_last4', 4);
            $table->text('guarantor_name_encrypted');
            $table->text('guarantor_phone_encrypted');
            $table->text('guarantor_relationship_encrypted');
            $table->string('address_proof_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_verification_details');
    }
};
