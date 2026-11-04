<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const DEFAULT_PROJECT_NAME = 'Siniestros Graves';

    public function up(): void
    {
        $alreadyExists = DB::table('powerbi_projects')->where('name', self::DEFAULT_PROJECT_NAME)->exists();

        if (! $alreadyExists) {
            $this->migrateToProject();
        }

        Schema::dropIfExists('powerbi_datas');
    }

    private function migrateToProject(): void
    {
        $empresaId = DB::table('empresas')
            ->where('active', true)
            ->orderBy('id')
            ->value('id')
            ?? DB::table('empresas')->orderBy('id')->value('id');

        $projectId = DB::table('powerbi_projects')->insertGetId([
            'empresa_id' => $empresaId,
            'name' => self::DEFAULT_PROJECT_NAME,
            'description' => null,
            'status' => 'draft',
            'public_token' => null,
            'handler' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! Schema::hasTable('powerbi_datas')) {
            return;
        }

        $sourceFile = DB::table('powerbi_datas')->whereNotNull('source_file')->value('source_file') ?? 'AT_GRAVES_3_ANIOS.xlsx';
        $rowCount = (int) DB::table('powerbi_datas')->count();

        $columns = $this->fixedColumns();

        $datasetId = DB::table('powerbi_datasets')->insertGetId([
            'project_id' => $projectId,
            'source_file' => $sourceFile,
            'row_count' => $rowCount,
            'columns' => json_encode($columns),
            'delimiter' => null,
            'encoding' => 'UTF-8',
            'imported_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('powerbi_datas')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($datasetId): void {
                $inserts = [];

                foreach ($rows as $row) {
                    $inserts[] = [
                        'dataset_id' => $datasetId,
                        'source_row_number' => $row->source_row_number,
                        'data' => json_encode($this->mapRow($row)),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                if ($inserts !== []) {
                    DB::table('powerbi_rows')->insert($inserts);
                }
            });

        $this->seedVisualizations($projectId, $datasetId);
    }

    /**
     * @return array<int, array{key: string, label: string, type: string}>
     */
    private function fixedColumns(): array
    {
        return [
            ['key' => 'numero_siniestro', 'label' => 'Número siniestro', 'type' => 'string'],
            ['key' => 'no_identificacion', 'label' => 'No. identificación', 'type' => 'string'],
            ['key' => 'nit', 'label' => 'NIT', 'type' => 'string'],
            ['key' => 'fecha_siniestro', 'label' => 'Fecha siniestro', 'type' => 'date'],
            ['key' => 'causal_evento_grave', 'label' => 'Causal evento grave', 'type' => 'string'],
            ['key' => 'municipio_ocurrencia_siniestro', 'label' => 'Municipio ocurrencia siniestro', 'type' => 'string'],
            ['key' => 'departamento_ocurrencia_siniestro', 'label' => 'Departamento ocurrencia siniestro', 'type' => 'string'],
            ['key' => 'cie_10_dx_1', 'label' => 'CIE-10 DX 1', 'type' => 'string'],
            ['key' => 'nombre_dx_1', 'label' => 'Nombre DX 1', 'type' => 'string'],
            ['key' => 'detalle', 'label' => 'Detalle', 'type' => 'string'],
            ['key' => 'mecanismo', 'label' => 'Mecanismo', 'type' => 'string'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapRow(object $row): array
    {
        return [
            'numero_siniestro' => $row->numero_siniestro,
            'no_identificacion' => $row->no_identificacion,
            'nit' => $row->nit,
            'fecha_siniestro' => $row->fecha_siniestro !== null
                ? Carbon::parse($row->fecha_siniestro)->format('Y-m-d')
                : null,
            'causal_evento_grave' => $row->causal_evento_grave,
            'municipio_ocurrencia_siniestro' => $row->municipio_ocurrencia_siniestro,
            'departamento_ocurrencia_siniestro' => $row->departamento_ocurrencia_siniestro,
            'cie_10_dx_1' => $row->cie_10_dx_1,
            'nombre_dx_1' => $row->nombre_dx_1,
            'detalle' => $row->detalle,
            'mecanismo' => $row->mecanismo,
        ];
    }

    private function seedVisualizations(int $projectId, int $datasetId): void
    {
        $visualizations = [
            [
                'title' => 'Total registros',
                'chart_type' => 'kpi',
                'config' => ['label_column' => null, 'value_column' => null, 'aggregation' => 'count', 'date_grouping' => null],
                'sort_order' => 0,
            ],
            [
                'title' => 'Tendencia mensual',
                'chart_type' => 'line',
                'config' => ['label_column' => 'fecha_siniestro', 'value_column' => null, 'aggregation' => 'count', 'date_grouping' => 'month'],
                'sort_order' => 1,
            ],
            [
                'title' => 'Eventos por causal',
                'chart_type' => 'pie',
                'config' => ['label_column' => 'causal_evento_grave', 'value_column' => null, 'aggregation' => 'count', 'date_grouping' => null],
                'sort_order' => 2,
            ],
            [
                'title' => 'Casos por departamento',
                'chart_type' => 'bar',
                'config' => ['label_column' => 'departamento_ocurrencia_siniestro', 'value_column' => null, 'aggregation' => 'count', 'date_grouping' => null],
                'sort_order' => 3,
            ],
            [
                'title' => 'Casos por mecanismo',
                'chart_type' => 'line',
                'config' => ['label_column' => 'mecanismo', 'value_column' => null, 'aggregation' => 'count', 'date_grouping' => null],
                'sort_order' => 4,
            ],
            [
                'title' => 'CIE-10 más frecuentes',
                'chart_type' => 'area',
                'config' => ['label_column' => 'cie_10_dx_1', 'value_column' => null, 'aggregation' => 'count', 'date_grouping' => null],
                'sort_order' => 5,
            ],
        ];

        foreach ($visualizations as $visualization) {
            DB::table('powerbi_visualizations')->insert([
                'project_id' => $projectId,
                'dataset_id' => $datasetId,
                'title' => $visualization['title'],
                'chart_type' => $visualization['chart_type'],
                'config' => json_encode($visualization['config']),
                'sort_order' => $visualization['sort_order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        $datasetId = null;
        $project = Schema::hasTable('powerbi_projects')
            ? DB::table('powerbi_projects')->where('name', self::DEFAULT_PROJECT_NAME)->first()
            : null;

        if ($project) {
            $datasetId = DB::table('powerbi_datasets')->where('project_id', $project->id)->value('id');
        }

        $rowsBackup = $datasetId !== null && Schema::hasTable('powerbi_rows')
            ? DB::table('powerbi_rows')->where('dataset_id', $datasetId)->orderBy('id')->get()
            : [];

        Schema::dropIfExists('powerbi_visualizations');
        Schema::dropIfExists('powerbi_rows');
        Schema::dropIfExists('powerbi_datasets');
        Schema::dropIfExists('powerbi_projects');

        if (! Schema::hasTable('powerbi_datas')) {
            $this->recreatePowerbiDatasTable();
        }

        if ($rowsBackup !== []) {
            $inserts = [];

            foreach ($rowsBackup as $row) {
                $data = json_decode((string) $row->data, true) ?: [];
                $inserts[] = [
                    'source_file' => 'AT_GRAVES_3_ANIOS.xlsx',
                    'sheet_name' => 'Siniestros graves',
                    'source_row_number' => $row->source_row_number,
                    'numero_siniestro' => $data['numero_siniestro'] ?? null,
                    'no_identificacion' => $data['no_identificacion'] ?? null,
                    'nit' => $data['nit'] ?? null,
                    'fecha_siniestro' => $data['fecha_siniestro'] ?? null,
                    'causal_evento_grave' => $data['causal_evento_grave'] ?? null,
                    'municipio_ocurrencia_siniestro' => $data['municipio_ocurrencia_siniestro'] ?? null,
                    'departamento_ocurrencia_siniestro' => $data['departamento_ocurrencia_siniestro'] ?? null,
                    'cie_10_dx_1' => $data['cie_10_dx_1'] ?? null,
                    'nombre_dx_1' => $data['nombre_dx_1'] ?? null,
                    'detalle' => $data['detalle'] ?? null,
                    'mecanismo' => $data['mecanismo'] ?? null,
                    'raw_data' => $data !== [] ? json_encode($data) : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            foreach (array_chunk($inserts, 500) as $chunk) {
                DB::table('powerbi_datas')->insert($chunk);
            }
        }
    }

    private function recreatePowerbiDatasTable(): void
    {
        Schema::create('powerbi_datas', function (Blueprint $table): void {
            $table->id();
            $table->string('source_file')->nullable();
            $table->string('sheet_name');
            $table->unsignedInteger('source_row_number');
            $table->string('numero_siniestro')->nullable();
            $table->string('no_identificacion')->nullable();
            $table->string('nit')->nullable();
            $table->dateTime('fecha_siniestro')->nullable();
            $table->string('causal_evento_grave')->nullable();
            $table->string('municipio_ocurrencia_siniestro')->nullable();
            $table->string('departamento_ocurrencia_siniestro')->nullable();
            $table->string('cie_10_dx_1')->nullable();
            $table->string('nombre_dx_1')->nullable();
            $table->longText('detalle')->nullable();
            $table->string('mecanismo')->nullable();
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->index(['sheet_name', 'source_row_number']);
            $table->index('numero_siniestro');
            $table->index('fecha_siniestro');
        });
    }
};
