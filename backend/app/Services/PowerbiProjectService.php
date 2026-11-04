<?php

namespace App\Services;

use App\Contracts\PowerbiTransformerContract;
use App\Models\PowerbiDataset;
use App\Models\PowerbiProject;
use App\Models\PowerbiRow;
use App\Models\PowerbiVisualization;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use RuntimeException;

class PowerbiProjectService
{
    public function __construct(
        private readonly PowerbiCsvService $csvService,
        private readonly PowerbiAnalyticsService $analytics,
    ) {}

    /**
     * @return array<int, string>
     */
    public function transformers(): array
    {
        return array_keys(config('powerbi.transformers', []));
    }

    /**
     * @return Collection<int, PowerbiProject>
     */
    public function index(): Collection
    {
        return PowerbiProject::query()
            ->with('empresa:id,name')
            ->withCount(['datasets', 'visualizations'])
            ->orderByDesc('updated_at')
            ->get();
    }

    public function show(PowerbiProject $project): PowerbiProject
    {
        return $project->load([
            'empresa:id,name,logo_path',
            'datasets' => fn ($query) => $query->orderBy('id'),
            'visualizations' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function store(array $data): PowerbiProject
    {
        return PowerbiProject::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PowerbiProject $project, array $data): PowerbiProject
    {
        $project->update($data);

        return $project->fresh();
    }

    public function destroy(PowerbiProject $project): void
    {
        $project->delete();
    }

    public function publish(PowerbiProject $project): PowerbiProject
    {
        $project->update([
            'status' => 'published',
            'public_token' => $project->public_token ?: $project->generatePublicToken(),
        ]);

        return $project->fresh();
    }

    public function unpublish(PowerbiProject $project): PowerbiProject
    {
        $project->update([
            'status' => 'draft',
        ]);

        return $project->fresh();
    }

    public function regenerateToken(PowerbiProject $project): PowerbiProject
    {
        $project->update([
            'public_token' => $project->generatePublicToken(),
        ]);

        return $project->fresh();
    }

    /**
     * @return array{
     *   columns: array<int, array{key: string, label: string, type: string}>,
     *   rows: array<int, array<string, mixed>>,
     *   row_count: int,
     *   preview_rows: array<int, array<string, mixed>>,
     *   delimiter: string,
     *   encoding: string
     * }
     */
    public function previewDataset(UploadedFile $file): array
    {
        $sheets = $this->parseUpload($file);
        $first = $sheets[0]['parsed'];

        return [
            'format' => in_array(strtolower($file->getClientOriginalExtension()), ['xlsx', 'xls'], true) ? 'excel' : 'csv',
            'columns' => $first['columns'],
            'rows' => [],
            'row_count' => array_sum(array_map(fn (array $sheet): int => $sheet['parsed']['row_count'], $sheets)),
            'preview_rows' => $first['preview_rows'],
            'delimiter' => $first['delimiter'],
            'encoding' => $first['encoding'],
            'sheets' => array_map(fn (array $sheet): array => [
                'name' => $sheet['name'],
                'columns' => $sheet['parsed']['columns'],
                'row_count' => $sheet['parsed']['row_count'],
                'preview_rows' => $sheet['parsed']['preview_rows'],
            ], $sheets),
        ];
    }

    /**
     * @return array{
     *   dataset: PowerbiDataset,
     *   rows_inserted: int,
     *   source_file: string,
     *   columns: array<int, array{key: string, label: string, type: string}>,
     *   preview_rows: array<int, array<string, mixed>>,
     *   delimiter: string,
     *   encoding: string
     * }
     */
    public function importDataset(PowerbiProject $project, UploadedFile $file): array
    {
        $sheets = $this->parseUpload($file);
        $transformer = $this->resolveTransformer($project->handler);
        $isWorkbook = in_array(strtolower($file->getClientOriginalExtension()), ['xlsx', 'xls'], true);
        $datasets = [];
        $inserted = 0;

        DB::transaction(function () use ($project, $file, $sheets, $transformer, $isWorkbook, &$datasets, &$inserted): void {
            foreach ($sheets as $sheet) {
                $parsed = $sheet['parsed'];
                $columns = $parsed['columns'];
                $rows = $parsed['rows'];

                if ($transformer !== null) {
                    $columns = $transformer->transformColumns($columns);
                    $rows = array_map(fn (array $row): array => $transformer->transformRow($row), $rows);
                }

                $dataset = PowerbiDataset::query()->create([
                    'project_id' => $project->id,
                    'source_file' => $isWorkbook
                        ? $file->getClientOriginalName().' — '.$sheet['name']
                        : $file->getClientOriginalName(),
                    'row_count' => count($rows),
                    'columns' => $columns,
                    'delimiter' => $parsed['delimiter'],
                    'encoding' => $parsed['encoding'],
                    'imported_at' => now(),
                ]);

                $inserts = [];

                foreach ($rows as $index => $row) {
                    $inserts[] = [
                        'dataset_id' => $dataset->id,
                        'source_row_number' => $index + 2,
                        'data' => json_encode($row),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                foreach (array_chunk($inserts, 500) as $chunk) {
                    PowerbiRow::query()->insert($chunk);
                }

                $inserted += count($inserts);
                $datasets[] = $dataset;
            }
        });

        $firstParsed = $sheets[0]['parsed'];

        return [
            'dataset' => $datasets[0],
            'datasets' => $datasets,
            'rows_inserted' => $inserted,
            'source_file' => $file->getClientOriginalName(),
            'columns' => $firstParsed['columns'],
            'preview_rows' => $firstParsed['preview_rows'],
            'delimiter' => $firstParsed['delimiter'],
            'encoding' => $firstParsed['encoding'],
        ];
    }

    /**
     * @return array<int, array{name: string|null, parsed: array<string, mixed>}>
     */
    private function parseUpload(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['xlsx', 'xls'], true)) {
            return [[
                'name' => null,
                'parsed' => $this->csvService->parse($this->readFile($file)),
            ]];
        }

        $spreadsheet = IOFactory::load($file->getRealPath());
        $parsedSheets = [];

        foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
            $csv = $this->worksheetAsCsv($worksheet);

            if ($csv !== '') {
                $parsedSheets[] = [
                    'name' => $worksheet->getTitle(),
                    'parsed' => $this->csvService->parse($csv),
                ];
            }
        }

        $spreadsheet->disconnectWorksheets();

        if ($parsedSheets === []) {
            throw new RuntimeException('El libro de Excel no contiene pestañas con datos utilizables.');
        }

        return $parsedSheets;
    }

    private function worksheetAsCsv(Worksheet $worksheet): string
    {
        $stream = fopen('php://temp', 'r+');
        $headerFound = false;
        $hasData = false;

        foreach ($worksheet->toArray(null, true, true, false) as $row) {
            $values = array_map(static function (mixed $value): string|int|float|bool {
                if ($value instanceof \DateTimeInterface) {
                    return $value->format('Y-m-d H:i:s');
                }

                if (is_scalar($value) || $value === null) {
                    return $value ?? '';
                }

                return (string) $value;
            }, $row);

            while ($values !== [] && trim((string) $values[count($values) - 1]) === '') {
                array_pop($values);
            }

            if ($values === []) {
                continue;
            }

            if (count(array_filter($values, fn (mixed $value): bool => trim((string) $value) !== '')) === 0) {
                continue;
            }

            if ($headerFound) {
                $hasData = true;
            }
            $headerFound = true;
            fputcsv($stream, $values);
        }

        rewind($stream);
        $csv = stream_get_contents($stream) ?: '';
        fclose($stream);

        return $hasData ? $csv : '';
    }

    /**
     * @return Collection<int, PowerbiDataset>
     */
    public function datasets(PowerbiProject $project): Collection
    {
        return $project->datasets()->orderBy('id')->get();
    }

    public function destroyDataset(PowerbiDataset $dataset): void
    {
        DB::transaction(function () use ($dataset): void {
            PowerbiVisualization::query()->where('dataset_id', $dataset->id)->delete();
            $dataset->delete();
        });
    }

    /**
     * @return Collection<int, PowerbiVisualization>
     */
    public function visualizations(PowerbiProject $project): Collection
    {
        return $project->visualizations()->orderBy('sort_order')->orderBy('id')->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function storeVisualization(PowerbiProject $project, array $data): PowerbiVisualization
    {
        $nextSort = PowerbiVisualization::query()
            ->where('project_id', $project->id)
            ->max('sort_order');

        return PowerbiVisualization::query()->create($data + [
            'project_id' => $project->id,
            'sort_order' => ((int) $nextSort) + 1,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateVisualization(PowerbiVisualization $visualization, array $data): PowerbiVisualization
    {
        $visualization->update($data);

        return $visualization->fresh();
    }

    public function destroyVisualization(PowerbiVisualization $visualization): void
    {
        $visualization->delete();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function dashboard(PowerbiProject $project, ?int $datasetId, array $filters): array
    {
        $datasets = $project->datasets()->orderBy('id')->get();

        if ($datasets->isEmpty()) {
            return [
                'message' => 'El proyecto no tiene datasets cargados.',
                'project' => ['id' => $project->id, 'name' => $project->name],
                'datasets' => [],
                'dataset' => null,
                'visualizations' => [],
                'sst_indicators' => null,
                'filter_options' => [],
                'row_count' => 0,
            ];
        }

        $activeDataset = $datasets->firstWhere('id', $datasetId) ?? $datasets->first();
        $columns = $activeDataset->columns ?? [];
        $rows = $activeDataset->rows()->pluck('data')->all();
        $filteredRows = $this->analytics->applyFilters($rows, $filters, $columns);

        $visualizations = PowerbiVisualization::query()
            ->where('project_id', $project->id)
            ->where('dataset_id', $activeDataset->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $visualizationResults = $visualizations->map(function (PowerbiVisualization $visualization) use ($columns, $filteredRows): array {
            $config = $visualization->config ?? [];
            $isKpi = $visualization->chart_type === 'kpi';

            return [
                'id' => $visualization->id,
                'title' => $visualization->title,
                'chart_type' => $visualization->chart_type,
                'config' => $config,
                'points' => $isKpi ? [] : $this->analytics->aggregate($columns, $filteredRows, $config),
                'kpi' => $isKpi ? $this->analytics->kpi($filteredRows, $config) : null,
            ];
        });

        return [
            'message' => 'Dashboard cargado correctamente.',
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'datasets' => $datasets->map(fn (PowerbiDataset $dataset): array => [
                'id' => $dataset->id,
                'source_file' => $dataset->source_file,
                'row_count' => $dataset->row_count,
            ])->values()->all(),
            'dataset' => [
                'id' => $activeDataset->id,
                'source_file' => $activeDataset->source_file,
                'row_count' => $activeDataset->row_count,
                'columns' => $columns,
            ],
            'visualizations' => $visualizationResults->values()->all(),
            'sst_indicators' => $this->sstIndicators($datasets),
            'filter_options' => $this->analytics->filterOptions($columns, $filteredRows),
            'row_count' => count($filteredRows),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicShow(string $token, ?int $datasetId = null, array $filters = []): array
    {
        $project = PowerbiProject::query()
            ->with('empresa:id,name,logo_path')
            ->where('public_token', $token)
            ->where('status', 'published')
            ->first();

        if (! $project) {
            abort(404, 'El enlace público no existe o no está publicado.');
        }

        $datasets = $project->datasets()->orderBy('id')->get();
        $visualizations = $project->visualizations()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->groupBy('dataset_id');

        $activeDataset = $datasets->firstWhere('id', $datasetId) ?? $datasets->first();
        $activeFilteredRows = [];

        $datasetResults = $datasets->map(function (PowerbiDataset $dataset) use ($visualizations, $activeDataset, $filters, &$activeFilteredRows): array {
            $columns = $dataset->columns ?? [];
            $rows = $dataset->rows()->pluck('data')->all();
            $filteredRows = $activeDataset?->id === $dataset->id
                ? $this->analytics->applyFilters($rows, $filters, $columns)
                : $rows;

            if ($activeDataset?->id === $dataset->id) {
                $activeFilteredRows = $filteredRows;
            }

            $items = collect($visualizations->get($dataset->id, []))
                ->map(function (PowerbiVisualization $visualization) use ($columns, $filteredRows): array {
                    $config = $visualization->config ?? [];
                    $isKpi = $visualization->chart_type === 'kpi';

                    return [
                        'id' => $visualization->id,
                        'title' => $visualization->title,
                        'chart_type' => $visualization->chart_type,
                        'config' => $config,
                        'points' => $isKpi ? [] : $this->analytics->aggregate($columns, $filteredRows, $config),
                        'kpi' => $isKpi ? $this->analytics->kpi($filteredRows, $config) : null,
                    ];
                })
                ->values();

            return [
                'id' => $dataset->id,
                'source_file' => $dataset->source_file,
                'row_count' => $dataset->row_count,
                'filtered_row_count' => count($filteredRows),
                'visualizations' => $items->all(),
            ];
        });

        return [
            'message' => 'Proyecto público cargado correctamente.',
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'updated_at' => $project->updated_at?->toIso8601String(),
            ],
            'empresa' => $project->empresa ? [
                'id' => $project->empresa->id,
                'name' => $project->empresa->name,
                'logo_url' => $project->empresa->logo_url,
            ] : null,
            'filter_options' => $activeDataset
                ? $this->analytics->filterOptions($activeDataset->columns ?? [], $activeFilteredRows)
                : [],
            'row_count' => count($activeFilteredRows),
            'sst_indicators' => $this->sstIndicators($datasets),
            'datasets' => $datasetResults->values()->all(),
        ];
    }

    /**
     * Calcula indicadores específicos del libro Datos ASA a partir de sus
     * pestañas importadas como datasets independientes.
     *
     * @param  Collection<int, PowerbiDataset>  $datasets
     * @return array<string, mixed>|null
     */
    private function sstIndicators(Collection $datasets): ?array
    {
        $datasetForSheet = static function (string $sheet) use ($datasets): ?PowerbiDataset {
            return $datasets->first(fn (PowerbiDataset $dataset): bool =>
                str_contains(mb_strtolower($dataset->source_file), '— '.mb_strtolower($sheet))
                || str_ends_with(mb_strtolower($dataset->source_file), mb_strtolower($sheet))
            );
        };

        $workersDataset = $datasetForSheet('Trabajadores');
        $accidentsDataset = $datasetForSheet('Accidentalidad');
        $absenceDataset = $datasetForSheet('Ausentismo');

        if (! $workersDataset || ! $accidentsDataset) {
            return null;
        }

        $rowsFor = static fn (PowerbiDataset $dataset): array => $dataset->rows()
            ->orderBy('source_row_number')
            ->get(['data'])
            ->map(fn (PowerbiRow $row): array => $row->data ?? [])
            ->all();
        $workerRows = $rowsFor($workersDataset);
        $accidentRows = $rowsFor($accidentsDataset);
        $workerColumns = $workersDataset->columns ?? [];
        $accidentColumns = $accidentsDataset->columns ?? [];

        $findColumn = static function (array $columns, string $pattern): ?string {
            foreach ($columns as $column) {
                $label = mb_strtolower(preg_replace('/\s+/u', ' ', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $column['label'] ?? '') ?: ($column['label'] ?? '')));
                if (preg_match($pattern, $label)) {
                    return $column['key'] ?? null;
                }
            }

            return null;
        };

        $hireDateColumn = $findColumn($workerColumns, '/fecha.*ingreso/');
        $accidentDateColumn = $findColumn($accidentColumns, '/fecha.*(siniestro|accidente|evento|\\bat\\b)/');
        $incapacityDaysColumn = $findColumn($accidentColumns, '/dias.*incapacidad/');
        $accidentTypeColumn = $findColumn($accidentColumns, '/tipo.*at|mortal|fatal/');
        $fatalFlagColumn = $findColumn($accidentColumns, '/mortal|fatal/');
        $absenceDateColumn = $absenceDataset ? $findColumn($absenceDataset->columns ?? [], '/fecha.*ausencia/') : null;
        $absenceDaysColumn = $absenceDataset ? $findColumn($absenceDataset->columns ?? [], '/dias.*ausencia/') : null;
        $absenceTypeColumn = $absenceDataset ? $findColumn($absenceDataset->columns ?? [], '/contingencia/') : null;

        if (! $hireDateColumn || ! $accidentDateColumn) {
            return null;
        }

        $parseDate = static function (mixed $value): ?\DateTimeImmutable {
            if (! is_string($value) || trim($value) === '') {
                return null;
            }

            $value = trim($value);
            foreach (['!d/m/Y H:i:s', '!Y-m-d H:i:s', '!Y-m-d\\TH:i:s', '!j M Y', '!j F Y', '!d/m/Y', '!Y-m-d', '!d-m-Y', '!m/d/Y'] as $format) {
                $date = \DateTimeImmutable::createFromFormat($format, $value);
                $errors = \DateTimeImmutable::getLastErrors();
                if ($date && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))) {
                    return $date;
                }
            }

            return null;
        };

        $workerStarts = [];
        foreach ($workerRows as $row) {
            $date = $parseDate($row[$hireDateColumn] ?? null);
            if ($date) {
                $workerStarts[] = $date;
            }
        }

        $accidentsByMonth = [];
        $medicalAbsenceByMonth = [];
        $latestAccidentDate = null;
        $fatalColumnPresent = false;
        foreach ($accidentColumns as $column) {
            $label = mb_strtolower(preg_replace('/\s+/u', ' ', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $column['label'] ?? '') ?: ($column['label'] ?? '')));
            if (preg_match('/mortal|fatal/', $label)) {
                $fatalColumnPresent = true;
                break;
            }
        }

        foreach ($accidentRows as $row) {
            $date = $parseDate($row[$accidentDateColumn] ?? null);
            if (! $date) {
                continue;
            }

            $month = $date->format('Y-m');
            $latestAccidentDate = $latestAccidentDate === null || $date > $latestAccidentDate ? $date : $latestAccidentDate;
            $accidentsByMonth[$month] ??= ['accidents' => 0, 'incapacity_days' => 0, 'fatal_accidents' => 0];
            $accidentsByMonth[$month]['accidents']++;

            $days = $incapacityDaysColumn ? $row[$incapacityDaysColumn] ?? null : null;
            if (is_numeric($days)) {
                $accidentsByMonth[$month]['incapacity_days'] += (float) $days;
            }

            $classification = $accidentTypeColumn ? mb_strtolower(trim((string) ($row[$accidentTypeColumn] ?? ''))) : '';
            $fatalFlag = $fatalFlagColumn ? mb_strtolower(trim((string) ($row[$fatalFlagColumn] ?? ''))) : '';
            $isFatal = $fatalFlagColumn
                ? in_array($fatalFlag, ['1', 'si', 'sí', 'yes', 'true', 'x', 'mortal', 'fatal'], true)
                : (bool) preg_match('/\b(mortal|fatal|muerte|fallecido)\b/u', $classification);
            if ($isFatal) {
                $fatalColumnPresent = true;
                $accidentsByMonth[$month]['fatal_accidents']++;
            }
        }

        if ($absenceDataset && $absenceDateColumn && $absenceDaysColumn && $absenceTypeColumn) {
            foreach ($rowsFor($absenceDataset) as $row) {
                $date = $parseDate($row[$absenceDateColumn] ?? null);
                $contingency = mb_strtoupper(trim((string) ($row[$absenceTypeColumn] ?? '')));
                $days = $row[$absenceDaysColumn] ?? null;
                if (! $date || ! in_array($contingency, ['EG', 'AT'], true) || ! is_numeric($days)) {
                    continue;
                }

                $monthKey = $date->format('Y-m');
                $medicalAbsenceByMonth[$monthKey] = ($medicalAbsenceByMonth[$monthKey] ?? 0) + (float) $days;
            }
        }

        if ($workerStarts === [] || $latestAccidentDate === null || $accidentsByMonth === []) {
            return null;
        }

        $firstMonth = min(array_keys($accidentsByMonth));
        $lastMonth = max(array_keys($accidentsByMonth));
        $month = new \DateTimeImmutable($firstMonth.'-01');
        $last = new \DateTimeImmutable($lastMonth.'-01');
        $monthly = [];

        while ($month <= $last) {
            $monthKey = $month->format('Y-m');
            $monthStart = $month;
            $monthEnd = $month->modify('last day of this month');
            $workers = 0;
            $scheduledDays = 0;

            foreach ($workerStarts as $start) {
                if ($start > $monthEnd) {
                    continue;
                }

                $workers++;
                $workday = $start > $monthStart ? $start : $monthStart;
                for (; $workday <= $monthEnd; $workday = $workday->modify('+1 day')) {
                    if ((int) $workday->format('w') !== 0) {
                        $scheduledDays++;
                    }
                }
            }

            $stats = $accidentsByMonth[$monthKey] ?? ['accidents' => 0, 'incapacity_days' => 0, 'fatal_accidents' => 0];
            $medicalAbsenceDays = $medicalAbsenceByMonth[$monthKey] ?? 0;
            $monthly[] = [
                'month' => $monthKey,
                'workers' => $workers,
                'scheduled_days_estimated' => $scheduledDays,
                'accidents' => $stats['accidents'],
                'incapacity_days_recorded' => $stats['incapacity_days'],
                'fatal_accidents' => $stats['fatal_accidents'],
                'medical_absence_days' => $medicalAbsenceDays,
                'medical_absenteeism_percentage' => $scheduledDays > 0 ? ($medicalAbsenceDays / $scheduledDays) * 100 : 0,
            ];
            $month = $month->modify('first day of next month');
        }

        $totalScheduledDays = array_sum(array_column($monthly, 'scheduled_days_estimated'));
        $totalMedicalAbsenceDays = array_sum(array_column($monthly, 'medical_absence_days'));

        return [
            'monthly' => $monthly,
            'medical_absenteeism' => [
                'absence_days' => $totalMedicalAbsenceDays,
                'scheduled_days_estimated' => $totalScheduledDays,
                'percentage' => $totalScheduledDays > 0 ? ($totalMedicalAbsenceDays / $totalScheduledDays) * 100 : 0,
                'by_month' => array_map(fn (array $item): array => [
                    'month' => $item['month'],
                    'absence_days' => $item['medical_absence_days'],
                    'scheduled_days_estimated' => $item['scheduled_days_estimated'],
                    'percentage' => $item['medical_absenteeism_percentage'],
                ], $monthly),
            ],
            'fatal_accidents_identified' => $fatalColumnPresent,
            'fatal_accidents_total' => array_sum(array_column($monthly, 'fatal_accidents')),
            'fatal_accidents_by_month' => array_map(fn (array $item): array => [
                'label' => $item['month'],
                'value' => $item['fatal_accidents'],
            ], $monthly),
            'notes' => [
                'workers' => 'Conteo acumulado de todas las personas con fecha de ingreso hasta cada mes; no hay fecha de retiro en la base.',
                'scheduled_days' => 'Estimación con seis días laborables por semana, excluyendo domingos, según el patrón de DIAS PROGRAMADOS. No descuenta festivos ni turnos individuales.',
                'incapacity_days' => 'Suma de días de incapacidad registrados; no equivale a días cargados por fatalidad o pérdida de capacidad laboral.',
                'medical_absenteeism' => 'Incluye contingencias EG y AT. El cálculo usa días de ausencia de esas incapacidades sobre días programados estimados; excluye LUTO, LM y LP.',
                'fatal_accidents' => $fatalColumnPresent ? 'Casos identificados en la clasificación disponible.' : 'La base no tiene una clasificación o columna que identifique accidentes mortales.',
            ],
        ];
    }

    private function resolveTransformer(?string $handler): ?PowerbiTransformerContract
    {
        if ($handler === null || $handler === '') {
            return null;
        }

        $class = config("powerbi.transformers.{$handler}");

        if (! is_string($class) || ! class_exists($class)) {
            return null;
        }

        $instance = app($class);

        return $instance instanceof PowerbiTransformerContract ? $instance : null;
    }

    private function readFile(UploadedFile $file): string
    {
        $content = $file->get();

        if ($content === false || $content === '') {
            throw new RuntimeException('No fue posible leer el archivo CSV.');
        }

        return $content;
    }
}
