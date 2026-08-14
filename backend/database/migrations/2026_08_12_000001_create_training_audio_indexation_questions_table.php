<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_audio_indexation_questions')) {
            return;
        }

        Schema::create('training_audio_indexation_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_audio_indexation_id');
            $table->foreign('training_audio_indexation_id', 'taiq_indexation_fk')
                ->references('id')
                ->on('training_audio_indexations')
                ->cascadeOnDelete();
            $table->foreignId('question_id');
            $table->foreign('question_id', 'taiq_question_fk')
                ->references('id')
                ->on('questions')
                ->cascadeOnDelete();
            $table->unsignedInteger('theme_order');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['training_audio_indexation_id', 'theme_order', 'question_id'], 'taiq_theme_question_unique');
            $table->index(['training_audio_indexation_id', 'theme_order'], 'taiq_indexation_theme_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_audio_indexation_questions');
    }
};
