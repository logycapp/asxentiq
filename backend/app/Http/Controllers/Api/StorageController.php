<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    public function show(Request $request, string $path)
    {
        if ($path === '' || str_contains($path, '..')) {
            return response()->json(['message' => 'Archivo no valido.'], 422);
        }

        if (! Storage::disk('public')->exists($path)) {
            return response()->json(['message' => 'Archivo no encontrado.'], 404);
        }

        return response()->file(Storage::disk('public')->path($path));
    }
}
