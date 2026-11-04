<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            if (! Schema::hasColumn('training_participants', 'attempt_started_at')) {
                $table->dateTime('attempt_started_at')->nullable()->after('completed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            if (Schema::hasColumn('training_participants', 'attempt_started_at')) {
                $table->dropColumn('attempt_started_at');
            }
        });
    }
};
