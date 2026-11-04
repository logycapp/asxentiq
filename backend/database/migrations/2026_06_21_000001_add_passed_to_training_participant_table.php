<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_participant', function (Blueprint $table): void {
            $table->boolean('passed')->nullable()->after('score');
        });
    }

    public function down(): void
    {
        Schema::table('training_participant', function (Blueprint $table): void {
            $table->dropColumn('passed');
        });
    }
};
