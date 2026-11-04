<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participant_answers', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('training_participant_id');
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->text('answer_text')->nullable();
            $table->foreignId('selected_option_id')->nullable()->constrained('question_options')->nullOnDelete();
            $table->boolean('is_correct')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();

            $table->foreign('training_participant_id', 'pa_tp_fk')
                  ->references('id')
                  ->on('training_participant')
                  ->cascadeOnDelete();

            $table->unique(['training_participant_id', 'question_id'], 'pa_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participant_answers');
    }
};