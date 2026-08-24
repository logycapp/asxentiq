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
        return $this->csvService->parse($this->readFile($file));
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
        $parsed = $this->csvService->parse($this->readFile($file));
        $columns = $parsed['columns'];
        $rows = $parsed['rows'];

        $transformer = $this->resolveTransformer($project->handler);

        if ($transformer !== null) {
            $columns = $transformer->transformColumns($columns);
            $rows = array_map(fn (array $row): array => $transformer->transformRow($row), $rows);
        }

        $dataset = null;
        $inserted = 0;

        DB::transaction(function () use ($project, $file, $columns, $rows, $parsed, &$dataset, &$inserted): void {
            $dataset = PowerbiDataset::query()->create([
                'project_id' => $project->id,
                'source_file' => $file->getClientOriginalName(),
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

            $inserted = count($inserts);
        });

        return [
            'dataset' => $dataset,
            'rows_inserted' => $inserted,
            'source_file' => $file->getClientOriginalName(),
            'columns' => $columns,
            'preview_rows' => $parsed['preview_rows'],
            'delimiter' => $parsed['delimiter'],
            'encoding' => $parsed['encoding'],
        ];
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
            'datasets' => $datasetResults->values()->all(),
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
