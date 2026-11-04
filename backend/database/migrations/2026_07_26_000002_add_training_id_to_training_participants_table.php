<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $table->foreignId('training_id')->after('id')->nullable()->constrained()->cascadeOnDelete();
            $table->dropUnique('training_participants_document_number_unique');
            $table->unique(['training_id', 'document_number'], 'training_participants_training_document_unique');
        });
    }

    public function down(): void
    {
        Schema::table('training_participants', function (Blueprint $table): void {
            $table->dropUnique('training_participants_training_document_unique');
            $table->dropConstrainedForeignId('training_id');
            $table->unique('document_number');
        });
    }
};
