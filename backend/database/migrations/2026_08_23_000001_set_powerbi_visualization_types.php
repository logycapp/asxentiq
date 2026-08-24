<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $projectId = DB::table('powerbi_projects')
            ->where('name', 'Siniestros Graves')
            ->value('id');

        if ($projectId === null) {
            return;
        }

        $types = [
            'Eventos por causal' => 'pie',
            'Casos por departamento' => 'bar',
            'Casos por mecanismo' => 'line',
            'CIE-10 más frecuentes' => 'area',
        ];

        foreach ($types as $title => $chartType) {
            DB::table('powerbi_visualizations')
                ->where('project_id', $projectId)
                ->where('title', $title)
                ->update([
                    'chart_type' => $chartType,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        $projectId = DB::table('powerbi_projects')
            ->where('name', 'Siniestros Graves')
            ->value('id');

        if ($projectId === null) {
            return;
        }

        DB::table('powerbi_visualizations')
            ->where('project_id', $projectId)
            ->whereIn('title', [
                'Eventos por causal',
                'Casos por departamento',
                'Casos por mecanismo',
                'CIE-10 más frecuentes',
            ])
            ->update([
                'chart_type' => 'bar',
                'updated_at' => now(),
            ]);
    }
};
