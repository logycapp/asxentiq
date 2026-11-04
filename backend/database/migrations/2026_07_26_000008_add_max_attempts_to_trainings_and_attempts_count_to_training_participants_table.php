<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table): void {
            if (! Schema::hasColumn('trainings', 'max_attempts')) {
                $table->unsignedInteger('max_attempts')->default(1)->after('passing_score');
            }
        });

        Schema::table('training_participants', function (Blueprint $table): void {
            if (! Schema::hasColumn('training_participants', 'attempts_count')) {
                $table->unsignedInteger('attempts_count')->default(0)->after('completed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            if (Schema::hasColumn('training_participants', 'attempts_count')) {
                $table->dropColumn('attempts_count');
            }
        });

        Schema::table('trainings', function (Blueprint $table): void {
            if (Schema::hasColumn('trainings', 'max_attempts')) {
                $table->dropColumn('max_attempts');
            }
        });
    }
};
