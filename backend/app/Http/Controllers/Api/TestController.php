<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dato1' => ['required', 'string', 'max:255'],
            'dato2' => ['required', 'string', 'max:255'],
            'adjunto' => ['required', 'file', 'max:102400'],
        ]);

        $file = $request->file('adjunto');

        return response()->json([
            'message' => 'Datos recibidos correctamente.',
            'data' => [
                'dato1' => $data['dato1'],
                'dato2' => $data['dato2'],
            ],
            'adjunto' => [
                'original_name' => $file?->getClientOriginalName(),
                'mime_type' => $file?->getMimeType(),
                'size_bytes' => $file?->getSize(),
            ],
        ]);
    }
}
