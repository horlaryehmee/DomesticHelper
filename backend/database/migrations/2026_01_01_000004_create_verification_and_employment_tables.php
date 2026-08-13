<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('identity_verifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['phone', 'email', 'photo', 'nin', 'address'])->index();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->text('private_notes')->nullable(); // admin/internal only
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'type']);
        });

        Schema::create('evidence', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->nullableMorphs('evidenceable');
            $table->foreignId('uploader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_name');
            $table->string('path'); // private disk
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('size')->default(0);
            $table->string('sha256', 64)->nullable();
            $table->timestamps();
        });

        Schema::create('employment_records', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->string('job_role');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->unsignedInteger('salary')->nullable();
            $table->enum('employment_type', ['full_time', 'part_time', 'live_in', 'other'])->default('full_time');
            $table->string('location')->nullable(); // general location only
            $table->enum('status', ['pending', 'active', 'completed', 'terminated', 'disputed'])->default('pending')->index();
            $table->enum('verification_status', ['unverified', 'verified', 'rejected'])->default('unverified')->index();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('termination_reason')->nullable(); // shown only on verified history
            $table->unsignedTinyInteger('performance_rating')->nullable();
            $table->text('private_notes')->nullable();
            $table->timestamps();

            $table->index(['employer_id', 'helper_id']);
            $table->index(['helper_id', 'verification_status']);
        });

        Schema::create('employment_verifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('employment_record_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('token', 80)->unique(); // secure response link token
            $table->enum('status', ['pending', 'confirmed', 'unable_to_confirm', 'disputed'])->default('pending')->index();
            $table->string('confirmed_job_role')->nullable();
            $table->date('confirmed_start_date')->nullable();
            $table->date('confirmed_end_date')->nullable();
            $table->unsignedTinyInteger('confirmed_performance')->nullable();
            $table->text('response_notes')->nullable();
            $table->foreignId('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('reference_checks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete(); // employer
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->string('referee_name');
            $table->string('referee_phone', 30)->nullable();
            $table->string('referee_email')->nullable();
            $table->string('relationship')->nullable();
            $table->string('employment_period')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending')->index();
            // Operator findings (private — never exposed publicly)
            $table->boolean('worked_there')->nullable();
            $table->string('confirmed_role')->nullable();
            $table->string('duration_reported')->nullable();
            $table->text('performance_notes')->nullable();
            $table->text('reason_for_leaving')->nullable();
            $table->boolean('would_rehire')->nullable();
            $table->text('additional_notes')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_checks');
        Schema::dropIfExists('employment_verifications');
        Schema::dropIfExists('employment_records');
        Schema::dropIfExists('evidence');
        Schema::dropIfExists('identity_verifications');
    }
};
