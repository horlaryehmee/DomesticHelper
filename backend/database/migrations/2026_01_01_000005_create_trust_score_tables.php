<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trust_score_rules', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name');
            $table->string('event_type', 80)->index();
            $table->string('description')->nullable();
            $table->integer('points');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('trust_score_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('rule_id')->nullable()->constrained('trust_score_rules')->nullOnDelete();
            $table->string('event_type', 80)->index();
            $table->integer('points');
            $table->nullableMorphs('source'); // employment_record / review / report / dispute / manual
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable()->index();
        });

        Schema::create('trust_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('helper_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('score')->default(50);
            $table->enum('category', ['high', 'moderate', 'needs_review'])->default('moderate');
            $table->unsignedInteger('events_count')->default(0);
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trust_scores');
        Schema::dropIfExists('trust_score_events');
        Schema::dropIfExists('trust_score_rules');
    }
};
