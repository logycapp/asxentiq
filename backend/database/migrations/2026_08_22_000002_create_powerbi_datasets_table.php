<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('powerbi_datasets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('powerbi_projects')->cascadeOnDelete();
            $table->string('source_file');
            $table->unsignedInteger('row_count')->default(0);
            $table->json('columns');
            $table->string('delimiter')->nullable();
            $table->string('encoding')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->index('project_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('powerbi_datasets');
    }
};
