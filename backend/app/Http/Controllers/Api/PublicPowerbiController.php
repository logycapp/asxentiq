<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PowerbiProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicPowerbiController extends Controller
{
    public function __construct(private readonly PowerbiProjectService $projectService) {}

    public function show(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'dataset_id' => ['nullable', 'integer'],
            'filters' => ['nullable', 'array'],
        ]);

        return response()->json($this->projectService->publicShow(
            $token,
            $request->integer('dataset_id') ?: null,
            $request->input('filters', []),
        ));
    }
}
