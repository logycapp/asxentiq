<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_participant', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_participant_id')->constrained()->cascadeOnDelete();
            $table->boolean('attended')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('observations')->nullable();
            $table->date('attendance_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['training_id', 'training_participant_id'], 'tp_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_participant');
    }
};