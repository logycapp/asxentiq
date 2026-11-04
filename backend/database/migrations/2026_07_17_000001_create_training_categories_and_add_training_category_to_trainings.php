<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('trainings', function (Blueprint $table): void {
            $table->foreignId('training_category_id')
                ->nullable()
                ->after('id')
                ->constrained('training_categories')
                ->restrictOnDelete();
        });

        $defaultCategoryId = DB::table('training_categories')->insertGetId([
            'name' => 'Capacitaciones de seguridad vial',
            'description' => 'Grupo inicial para capacitaciones relacionadas con seguridad vial.',
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('trainings')
            ->whereNull('training_category_id')
            ->update(['training_category_id' => $defaultCategoryId]);
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('training_category_id');
        });

        Schema::dropIfExists('training_categories');
    }
};
