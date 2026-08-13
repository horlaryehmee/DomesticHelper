<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('employment_record_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating'); // 1-5
            $table->string('work_type')->nullable();
            $table->string('duration_worked')->nullable();
            $table->text('feedback');
            $table->enum('status', ['pending', 'approved', 'rejected', 'disputed', 'removed'])->default('pending')->index();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->text('moderation_note')->nullable();
            $table->timestamps();

            $table->index(['helper_id', 'status']);
        });

        Schema::create('review_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->timestamps();
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('employment_record_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('category', ['theft', 'misconduct', 'job_abandonment', 'poor_performance', 'fraud', 'property_damage', 'other'])->index();
            $table->text('description');
            $table->enum('status', ['submitted', 'under_review', 'awaiting_helper_response', 'closed'])->default('submitted')->index();
            $table->enum('outcome', ['unsubstantiated', 'resolved', 'verified', 'dismissed', 'partially_verified', 'escalated'])->nullable()->index();
            $table->text('helper_response')->nullable();
            $table->text('admin_decision')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['helper_id', 'status']);
        });

        Schema::create('report_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->timestamps();
        });

        Schema::create('disputes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->nullableMorphs('disputable'); // review / report / trust score event / verification
            $table->string('reason', 200);
            $table->text('explanation');
            $table->enum('status', ['submitted', 'under_review', 'awaiting_response', 'resolved', 'rejected', 'escalated'])->default('submitted')->index();
            $table->text('resolution_decision')->nullable();
            $table->text('resolution_reason')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['helper_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disputes');
        Schema::dropIfExists('report_responses');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('review_responses');
        Schema::dropIfExists('reviews');
    }
};
