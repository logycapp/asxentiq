<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'video' => ['required', 'file', 'mimes:mp4,mov,avi,webm,mkv', 'max:102400'],
        ]);

        $file = $request->file('video');
        $path = $file?->store('test-videos', 'public');

        return response()->json([
            'message' => 'Video subido correctamente.',
            'data' => [
                'titulo' => $data['titulo'],
            ],
            'video' => [
                'original_name' => $file?->getClientOriginalName(),
                'mime_type' => $file?->getMimeType(),
                'size_bytes' => $file?->getSize(),
                'path' => $path,
                'url' => $path ? Storage::disk('public')->url($path) : null,
            ],
        ]);
    }

    public function extractAudio(Request $request): JsonResponse
    {
        $data = $request->validate([
            'video_path' => ['required', 'string', 'max:1024'],
        ]);

        $relativePath = $this->normalizePublicVideoPath($data['video_path']);

        if (! $relativePath) {
            return response()->json([
                'message' => 'La ruta del video no es valida.',
            ], 422);
        }

        $sourcePath = Storage::disk('public')->path($relativePath);

        if (! file_exists($sourcePath)) {
            return response()->json([
                'message' => 'El video no existe en el servidor.',
            ], 404);
        }

        if (! $this->ffmpegAvailable()) {
            return response()->json([
                'message' => 'No se encontro ffmpeg en el servidor.',
            ], 500);
        }

        $audioDirectory = 'test-audio';
        Storage::disk('public')->makeDirectory($audioDirectory);

        $baseName = pathinfo($relativePath, PATHINFO_FILENAME);
        $outputRelativePath = $audioDirectory.'/'.$baseName.'-'.Str::random(8).'.mp3';
        $outputPath = Storage::disk('public')->path($outputRelativePath);

        $command = sprintf(
            '%s -y -i %s -vn -acodec libmp3lame -q:a 2 %s 2>&1',
            escapeshellcmd(env('FFMPEG_PATH', 'ffmpeg')),
            escapeshellarg($sourcePath),
            escapeshellarg($outputPath),
        );

        $outputLines = [];
        $exitCode = 0;
        exec($command, $outputLines, $exitCode);

        if ($exitCode !== 0 || ! file_exists($outputPath)) {
            return response()->json([
                'message' => 'No fue posible convertir el video a MP3.',
                'details' => $outputLines,
            ], 500);
        }

        return response()->json([
            'message' => 'Audio extraido correctamente.',
            'source' => [
                'video_path' => $relativePath,
                'video_url' => Storage::disk('public')->url($relativePath),
            ],
            'audio' => [
                'original_name' => $baseName.'.mp3',
                'path' => $outputRelativePath,
                'url' => Storage::disk('public')->url($outputRelativePath),
            ],
        ]);
    }

    private function normalizePublicVideoPath(string $path): ?string
    {
        $path = trim($path);

        if ($path === '') {
            return null;
        }

        $parsedPath = parse_url($path, PHP_URL_PATH);
        if (is_string($parsedPath) && $parsedPath !== '') {
            $path = $parsedPath;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        if ($path === '' || str_contains($path, '..')) {
            return null;
        }

        if (! str_starts_with($path, 'test-videos/')) {
            return null;
        }

        return $path;
    }

    private function ffmpegAvailable(): bool
    {
        $binary = escapeshellcmd(env('FFMPEG_PATH', 'ffmpeg'));
        $output = [];
        $exitCode = 0;

        exec($binary.' -version 2>&1', $output, $exitCode);

        return $exitCode === 0;
    }
}
