<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TrainingCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $user?->loadMissing('roleRelation');
        $shouldRestrictByCompany = $user?->empresa_id && $user?->roleRelation?->slug !== 'admin';

        $categories = TrainingCategory::query()
            ->with('empresa:id,name')
            ->withCount('trainings')
            ->when(
                $shouldRestrictByCompany,
                fn ($query) => $query->where('empresa_id', $user->empresa_id)
            )
            ->orderByDesc('id')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $user?->loadMissing('roleRelation');
        $shouldRestrictByCompany = $user?->empresa_id && $user?->roleRelation?->slug !== 'admin';

        $data = $request->validate([
            'empresa_id' => ['required', 'integer', 'exists:empresas,id'],
            'name' => ['required', 'string', 'max:255', 'unique:training_categories,name'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = TrainingCategory::query()->create([
            'empresa_id' => $shouldRestrictByCompany ? $user->empresa_id : ($data['empresa_id'] ?? null),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Categoria creada correctamente.',
            'category' => $category->load('empresa:id,name'),
        ], 201);
    }

    public function show(TrainingCategory $category): JsonResponse
    {
        return response()->json($category->load('empresa:id,name')->loadCount('trainings'));
    }

    public function update(Request $request, TrainingCategory $category): JsonResponse
    {
        $user = Auth::user();
        $user?->loadMissing('roleRelation');
        $shouldRestrictByCompany = $user?->empresa_id && $user?->roleRelation?->slug !== 'admin';

        $data = $request->validate([
            'empresa_id' => ['required', 'integer', 'exists:empresas,id'],
            'name' => ['required', 'string', 'max:255', 'unique:training_categories,name,' . $category->id],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category->update([
            'empresa_id' => $shouldRestrictByCompany ? $user->empresa_id : ($data['empresa_id'] ?? null),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Categoria actualizada correctamente.',
            'category' => $category->fresh()->load('empresa:id,name')->loadCount('trainings'),
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
