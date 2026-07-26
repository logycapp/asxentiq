<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participant_answers', function (Blueprint $table): void {
            $table->dropForeign('pa_tp_fk');
            $table->foreign('training_participant_id', 'pa_tp_fk')
                ->references('id')
                ->on('training_participants')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('participant_answers', function (Blueprint $table): void {
            $table->dropForeign('pa_tp_fk');
            $table->foreign('training_participant_id', 'pa_tp_fk')
                ->references('id')
                ->on('training_participant')
                ->cascadeOnDelete();
        });
    }
};
