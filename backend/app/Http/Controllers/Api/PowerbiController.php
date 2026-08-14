<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PowerbiWorkbookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class PowerbiController extends Controller
{
    public function __construct(private readonly PowerbiWorkbookService $workbookService)
    {
    }

    public function dashboard(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'department' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'causal' => ['nullable', 'string', 'max:255'],
            'mechanism' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json($this->workbookService->dashboard($filters));
    }

    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:20480'],
        ]);

        $file = $request->file('file');

        if (! $file) {
            return response()->json([
                'message' => 'No fue posible leer el archivo enviado.',
            ], 422);
        }

        try {
            $preview = $this->workbookService->previewUploadedFile($file);
        } catch (Throwable $throwable) {
            $message = $throwable->getMessage() ?: 'No fue posible procesar el archivo Excel.';

            return response()->json([
                'message' => $message,
            ], 422);
        }

        if ($preview['sheets'] === []) {
            return response()->json([
                'message' => 'El archivo no contiene hojas con datos utilizables.',
            ], 422);
        }

        return response()->json([
            'message' => $preview['message'],
            'file' => [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ],
            'default_sheet_index' => $preview['default_sheet_index'],
            'sheets' => $preview['sheets'],
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:20480'],
        ]);

        $file = $request->file('file');

        if (! $file) {
            return response()->json([
                'message' => 'No fue posible leer el archivo enviado.',
            ], 422);
        }

        try {
            $inserted = $this->workbookService->importUploadedFile($file);
        } catch (Throwable $throwable) {
            $message = $throwable->getMessage() ?: 'No fue posible guardar la informacion del Excel.';

            return response()->json([
                'message' => $message,
            ], 422);
        }

        return response()->json([
            'message' => 'Datos de Excel guardados correctamente.',
            'rows_inserted' => $inserted,
            'source_file' => $file->getClientOriginalName(),
        ]);
    }
}
