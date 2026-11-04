<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $table->foreignId('empresa_id')
                ->nullable()
                ->after('id')
                ->constrained('empresas')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('empresa_id');
        });
    }
};
