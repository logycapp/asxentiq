<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $table->boolean('active')->default(true)->after('phone');
            $table->boolean('attended')->nullable()->after('active');
            $table->decimal('score', 5, 2)->nullable()->after('attended');
            $table->boolean('passed')->nullable()->after('score');
            $table->text('observations')->nullable()->after('passed');
            $table->date('attendance_date')->nullable()->after('observations');
            $table->timestamp('completed_at')->nullable()->after('attendance_date');
        });
    }

    public function down(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $table->dropColumn([
                'completed_at',
                'attendance_date',
                'observations',
                'passed',
                'score',
                'attended',
            ]);
            $table->dropColumn('active');
        });
    }
};
