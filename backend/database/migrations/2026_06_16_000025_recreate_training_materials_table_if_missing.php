<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_materials')) {
            return;
        }

        Schema::create('training_materials', function (Blueprint $table): void {
            $table->id();
            $table->morphs('trainable');
            $table->string('filename');
            $table->string('filepath');
            $table->string('mime_type');
            $table->integer('filesize')->nullable();
            $table->string('type');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_materials');
    }
};
