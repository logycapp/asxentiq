<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PowerbiDataset;
use App\Models\PowerbiProject;
use App\Models\PowerbiVisualization;
use App\Services\PowerbiProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class PowerbiController extends Controller
{
    public function __construct(private readonly PowerbiProjectService $projectService) {}

    public function transformers(): JsonResponse
    {
        return response()->json([
            'transformers' => $this->projectService->transformers(),
        ]);
    }

    public function index(): JsonResponse
    {
        return response()->json($this->projectService->index());
    }

    public function show(PowerbiProject $project): JsonResponse
    {
        return response()->json($this->projectService->show($project));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateProject($request);

        $project = $this->projectService->store($data);

        return response()->json([
            'message' => 'Proyecto creado correctamente.',
            'project' => $project->fresh(),
        ], 201);
    }

    public function update(Request $request, PowerbiProject $project): JsonResponse
    {
        $data = $this->validateProject($request);

        $updated = $this->projectService->update($project, $data);

        return response()->json([
            'message' => 'Proyecto actualizado correctamente.',
            'project' => $updated,
        ]);
    }

    public function destroy(PowerbiProject $project): JsonResponse
    {
        $this->projectService->destroy($project);

        return response()->json([
            'message' => 'Proyecto eliminado correctamente.',
        ]);
    }

    public function publish(PowerbiProject $project): JsonResponse
    {
        $updated = $this->projectService->publish($project);

        return response()->json([
            'message' => 'Proyecto publicado correctamente.',
            'project' => $updated,
        ]);
    }

    public function unpublish(PowerbiProject $project): JsonResponse
    {
        $updated = $this->projectService->unpublish($project);

        return response()->json([
            'message' => 'Proyecto despublicado correctamente.',
            'project' => $updated,
        ]);
    }

    public function regenerateToken(PowerbiProject $project): JsonResponse
    {
        $updated = $this->projectService->regenerateToken($project);

        return response()->json([
            'message' => 'Enlace público regenerado. La URL anterior dejó de funcionar.',
            'project' => $updated,
        ]);
    }

    public function previewDataset(Request $request, PowerbiProject $project): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:'.config('powerbi.max_file_size_kb', 20480)],
        ]);

        $file = $request->file('file');

        if (! $file) {
            return response()->json([
                'message' => 'No fue posible leer el archivo enviado.',
            ], 422);
        }

        try {
            $preview = $this->projectService->previewDataset($file);
        } catch (Throwable $throwable) {
            $message = $throwable->getMessage() ?: 'No fue posible procesar el archivo CSV.';

            return response()->json([
                'message' => $message,
            ], 422);
        }

        return response()->json([
            'message' => 'Archivo CSV procesado correctamente.',
            'file' => [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ],
            'delimiter' => $preview['delimiter'],
            'encoding' => $preview['encoding'],
            'columns' => $preview['columns'],
            'row_count' => $preview['row_count'],
            'preview_rows' => $preview['preview_rows'],
        ]);
    }

    public function importDataset(Request $request, PowerbiProject $project): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:'.config('powerbi.max_file_size_kb', 20480)],
        ]);

        $file = $request->file('file');

        if (! $file) {
            return response()->json([
                'message' => 'No fue posible leer el archivo enviado.',
            ], 422);
        }

        try {
            $result = $this->projectService->importDataset($project, $file);
        } catch (Throwable $throwable) {
            $message = $throwable->getMessage() ?: 'No fue posible guardar la información del CSV.';

            return response()->json([
                'message' => $message,
            ], 422);
        }

        return response()->json([
            'message' => 'Datos del CSV importados correctamente.',
            'rows_inserted' => $result['rows_inserted'],
            'source_file' => $result['source_file'],
            'dataset' => $result['dataset'],
            'columns' => $result['columns'],
            'preview_rows' => $result['preview_rows'],
            'delimiter' => $result['delimiter'],
            'encoding' => $result['encoding'],
        ]);
    }

    public function datasets(PowerbiProject $project): JsonResponse
    {
        return response()->json($this->projectService->datasets($project));
    }

    public function destroyDataset(PowerbiDataset $dataset): JsonResponse
    {
        $this->projectService->destroyDataset($dataset);

        return response()->json([
            'message' => 'Dataset eliminado correctamente.',
        ]);
    }

    public function visualizations(PowerbiProject $project): JsonResponse
    {
        return response()->json($this->projectService->visualizations($project));
    }

    public function storeVisualization(Request $request, PowerbiProject $project): JsonResponse
    {
        $data = $this->validateVisualization($request, $project);

        $visualization = $this->projectService->storeVisualization($project, $data);

        return response()->json([
            'message' => 'Visualización creada correctamente.',
            'visualization' => $visualization->fresh(),
        ], 201);
    }

    public function updateVisualization(Request $request, PowerbiVisualization $visualization): JsonResponse
    {
        $data = $this->validateVisualization($request, $visualization->project);

        $updated = $this->projectService->updateVisualization($visualization, $data);

        return response()->json([
            'message' => 'Visualización actualizada correctamente.',
            'visualization' => $updated,
        ]);
    }

    public function destroyVisualization(PowerbiVisualization $visualization): JsonResponse
    {
        $this->projectService->destroyVisualization($visualization);

        return response()->json([
            'message' => 'Visualización eliminada correctamente.',
        ]);
    }

    public function dashboard(Request $request, PowerbiProject $project): JsonResponse
    {
        $request->validate([
            'dataset_id' => ['nullable', 'integer', 'exists:powerbi_datasets,id'],
            'filters' => ['nullable', 'array'],
        ]);

        return response()->json($this->projectService->dashboard(
            $project,
            $request->integer('dataset_id') ?: null,
            $request->input('filters', []),
        ));
    }

    /**
     * @return array<string, mixed>
     */
    private function validateProject(Request $request): array
    {
        return $request->validate([
            'empresa_id' => ['nullable', 'integer', 'exists:empresas,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['sometimes', Rule::in(['draft', 'published'])],
            'handler' => ['nullable', Rule::in(array_keys(config('powerbi.transformers', [])))],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateVisualization(Request $request, PowerbiProject $project): array
    {
        return $request->validate([
            'dataset_id' => ['required', 'integer', Rule::exists('powerbi_datasets', 'id')->where('project_id', $project->id)],
            'title' => ['required', 'string', 'max:255'],
            'chart_type' => ['required', Rule::in(config('powerbi.chart_types', []))],
            'config' => ['nullable', 'array'],
            'config.label_column' => ['nullable', 'string', 'max:255'],
            'config.value_column' => ['nullable', 'string', 'max:255'],
            'config.aggregation' => ['nullable', Rule::in(config('powerbi.aggregations', []))],
            'config.date_grouping' => ['nullable', Rule::in(config('powerbi.date_groupings', []))],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }
}
