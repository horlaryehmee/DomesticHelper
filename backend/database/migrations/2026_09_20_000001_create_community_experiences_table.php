<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_experiences', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->enum('content_type', ['experience', 'video'])->default('experience')->index();
            $table->string('title', 160);
            $table->text('description');
            $table->string('category', 60)->default('other')->index();
            $table->string('subject_name', 120)->nullable();
            $table->string('location', 160)->nullable();
            $table->date('incident_date')->nullable();
            $table->string('source_url', 500)->nullable();
            $table->string('submitter_name', 120)->nullable();
            $table->string('submitter_email', 190)->nullable();
            $table->string('submitter_phone', 40)->nullable();
            $table->enum('status', ['pending', 'published', 'rejected', 'removed'])->default('pending')->index();
            $table->enum('verification_level', ['submitted', 'source_linked', 'evidence_reviewed'])->default('submitted');
            $table->text('moderation_note')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_experiences');
    }
};
