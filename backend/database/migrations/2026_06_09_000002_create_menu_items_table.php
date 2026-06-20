<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table): void {
            $table->id();
            $table->string('label');
            $table->string('route');
            $table->string('icon')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('role', 32)->default('all');
            $table->boolean('enabled')->default(true);
            $table->boolean('exact')->default(false);
            $table->timestamps();

            $table->unique(['role', 'route']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
