<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainings', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type'); // medical_exam, sst_training, drill, induction
            $table->string('modality')->default('presential'); // presential, virtual, mixed
            $table->date('scheduled_date');
            $table->date('completion_date')->nullable();
            $table->integer('duration_hours')->nullable();
            $table->string('location')->nullable();
            $table->string('instructor')->nullable();
            $table->boolean('mandatory')->default(true);
            $table->string('status')->default('scheduled'); // scheduled, completed, cancelled
            $table->decimal('passing_score', 5, 2)->default(70.00); // percentage to pass
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainings');
    }
};