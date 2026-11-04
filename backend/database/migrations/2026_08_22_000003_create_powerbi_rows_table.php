<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('powerbi_rows', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dataset_id')->constrained('powerbi_datasets')->cascadeOnDelete();
            $table->unsignedInteger('source_row_number');
            $table->json('data');
            $table->timestamps();

            $table->index('dataset_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('powerbi_rows');
    }
};
