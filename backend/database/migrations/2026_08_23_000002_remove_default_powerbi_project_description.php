<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('powerbi_projects')
            ->where('name', 'Siniestros Graves')
            ->update([
                'description' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('powerbi_projects')
            ->where('name', 'Siniestros Graves')
            ->update([
                'description' => 'Proyecto por defecto migrado desde la tabla powerbi_datas. Replica el dashboard original de siniestros graves.',
                'updated_at' => now(),
            ]);
    }
};
