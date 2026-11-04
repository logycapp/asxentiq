<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('powerbi_visualizations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('powerbi_projects')->cascadeOnDelete();
            $table->foreignId('dataset_id')->nullable()->constrained('powerbi_datasets')->cascadeOnDelete();
            $table->string('title');
            $table->string('chart_type');
            $table->json('config');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'dataset_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('powerbi_visualizations');
    }
};
