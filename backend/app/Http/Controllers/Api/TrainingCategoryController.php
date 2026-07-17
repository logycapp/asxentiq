<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = TrainingCategory::query()
            ->withCount('trainings')
            ->orderByDesc('id')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:training_categories,name'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = TrainingCategory::query()->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Categoria creada correctamente.',
            'category' => $category,
        ], 201);
    }

    public function show(TrainingCategory $category): JsonResponse
    {
        return response()->json($category->loadCount('trainings'));
    }

    public function update(Request $request, TrainingCategory $category): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:training_categories,name,' . $category->id],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Categoria actualizada correctamente.',
            'category' => $category->fresh()->loadCount('trainings'),
        ]);
    }

    public function destroy(TrainingCategory $category): JsonResponse
    {
        if ($category->trainings()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar una categoria con capacitaciones asociadas.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Categoria eliminada correctamente.',
        ]);
    }
}
