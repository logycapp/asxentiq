<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table): void {
            if (Schema::hasColumn('trainings', 'type')) {
                $table->dropColumn('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table): void {
            if (! Schema::hasColumn('trainings', 'type')) {
                $table->string('type')->nullable()->after('description');
            }
        });
    }
};
