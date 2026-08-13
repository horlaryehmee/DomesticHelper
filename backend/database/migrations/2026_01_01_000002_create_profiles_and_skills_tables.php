<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('profile_type', ['individual', 'agency'])->default('individual');
            $table->string('agency_name')->nullable();
            $table->string('address_line')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->text('bio')->nullable();
            $table->boolean('profile_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('helper_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('state')->nullable()->index();
            $table->string('city')->nullable()->index();
            $table->string('address_line')->nullable(); // private — never exposed via API
            $table->text('nin_encrypted')->nullable();  // private — encrypted at rest
            $table->string('nin_hash', 64)->nullable()->unique(); // sha256 for uniqueness checks
            $table->string('photo_path')->nullable();
            $table->text('bio')->nullable();
            $table->unsignedTinyInteger('years_experience')->default(0)->index();
            $table->enum('availability', ['immediate', 'within_1_week', 'within_2_weeks', 'within_1_month', 'negotiable'])
                ->default('immediate')->index();
            $table->enum('employment_type', ['full_time', 'part_time', 'live_in', 'any'])->default('any')->index();
            $table->unsignedInteger('expected_salary_min')->nullable();
            $table->unsignedInteger('expected_salary_max')->nullable();
            $table->boolean('is_public')->default(false)->index();
            $table->enum('verification_status', ['unverified', 'under_review', 'verified', 'flagged'])
                ->default('unverified')->index();
            $table->boolean('profile_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('skills', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name');
            $table->enum('category', ['helper', 'job'])->default('helper');
            $table->string('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('helper_skill', function (Blueprint $table) {
            $table->id();
            $table->foreignId('helper_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('years')->default(0);
            $table->timestamps();
            $table->unique(['helper_profile_id', 'skill_id']);
        });

        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('state', 100)->index();
            $table->string('city', 100)->index();
            $table->string('slug', 200)->unique();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
        Schema::dropIfExists('helper_skill');
        Schema::dropIfExists('skills');
        Schema::dropIfExists('helper_profiles');
        Schema::dropIfExists('employer_profiles');
    }
};
