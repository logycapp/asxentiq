<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table): void {
            if (! Schema::hasColumn('trainings', 'material_with_indexation')) {
                $table->boolean('material_with_indexation')->default(false)->after('mandatory');
            }
        });
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table): void {
            if (Schema::hasColumn('trainings', 'material_with_indexation')) {
                $table->dropColumn('material_with_indexation');
            }
        });
    }
};
