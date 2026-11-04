<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'privacy_consent_accepted_at')) {
                $table->timestamp('privacy_consent_accepted_at')->nullable()->after('sidebar_collapsed');
            }
        });

        Schema::table('training_participants', function (Blueprint $table): void {
            if (! Schema::hasColumn('training_participants', 'privacy_consent_accepted_at')) {
                $table->timestamp('privacy_consent_accepted_at')->nullable()->after('attempts_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'privacy_consent_accepted_at')) {
                $table->dropColumn('privacy_consent_accepted_at');
            }
        });

        Schema::table('training_participants', function (Blueprint $table): void {
            if (Schema::hasColumn('training_participants', 'privacy_consent_accepted_at')) {
                $table->dropColumn('privacy_consent_accepted_at');
            }
        });
    }
};
