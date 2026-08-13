<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('work_type'); // skill category e.g. nanny, driver
            $table->text('description');
            $table->text('responsibilities')->nullable();
            $table->text('requirements')->nullable();
            $table->unsignedInteger('salary_min')->nullable();
            $table->unsignedInteger('salary_max')->nullable();
            $table->enum('salary_type', ['monthly', 'weekly', 'daily', 'negotiable'])->default('monthly');
            $table->string('location')->nullable();
            $table->string('state')->nullable()->index();
            $table->string('city')->nullable()->index();
            $table->string('working_hours')->nullable();
            $table->boolean('accommodation_available')->default(false);
            $table->enum('employment_type', ['full_time', 'part_time', 'live_in', 'other'])->default('full_time');
            $table->date('start_date')->nullable();
            $table->enum('status', ['draft', 'active', 'filled', 'closed', 'reported'])->default('draft')->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['applied', 'shortlisted', 'rejected', 'interview', 'hired', 'withdrawn'])->default('applied')->index();
            $table->text('cover_note')->nullable();
            $table->timestamps();
            $table->unique(['job_id', 'helper_id']);
        });

        Schema::create('saved_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['helper_id', 'job_id']);
        });

        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('job_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->enum('mode', ['in_person', 'phone', 'video'])->default('phone');
            $table->timestamp('scheduled_at')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['requested', 'accepted', 'declined', 'completed', 'cancelled'])->default('requested')->index();
            $table->timestamps();
            $table->index(['employer_id', 'helper_id']);
        });

        Schema::create('saved_helper_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('saved_helpers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('list_id')->nullable()->constrained('saved_helper_lists')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->unique(['employer_id', 'helper_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_helpers');
        Schema::dropIfExists('saved_helper_lists');
        Schema::dropIfExists('interviews');
        Schema::dropIfExists('saved_jobs');
        Schema::dropIfExists('job_applications');
        Schema::dropIfExists('jobs');
    }
};
