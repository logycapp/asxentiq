<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            if (! Schema::hasColumn('training_participants', 'attended')) {
                $table->boolean('attended')->nullable()->after('active');
            }

            if (! Schema::hasColumn('training_participants', 'score')) {
                $table->decimal('score', 5, 2)->nullable()->after('attended');
            }

            if (! Schema::hasColumn('training_participants', 'passed')) {
                $table->boolean('passed')->nullable()->after('score');
            }

            if (! Schema::hasColumn('training_participants', 'observations')) {
                $table->text('observations')->nullable()->after('passed');
            }

            if (! Schema::hasColumn('training_participants', 'attendance_date')) {
                $table->date('attendance_date')->nullable()->after('observations');
            }

            if (! Schema::hasColumn('training_participants', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('attendance_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $columns = [];

            foreach (['completed_at', 'attendance_date', 'observations', 'passed', 'score', 'attended'] as $column) {
                if (Schema::hasColumn('training_participants', $column)) {
                    $columns[] = $column;
                }
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
