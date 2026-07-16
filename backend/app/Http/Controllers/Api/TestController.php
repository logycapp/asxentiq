<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GeminiAudioIndexService;
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
                'url' => $path ? $this->publicStorageApiUrl($path) : null,
            ],
        ]);
    }

    public function extractAudio(Request $request): JsonResponse
    {
        $data = $request->validate([
            'video_path' => ['required', 'string', 'max:1024'],
        ]);

        $relativePath = $this->normalizePublicPath($data['video_path'], 'test-videos/');

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

        $ffmpegBinary = $this->resolveFfmpegBinary();

        if ($ffmpegBinary === null) {
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
            escapeshellcmd($ffmpegBinary),
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
                'video_url' => $this->publicStorageApiUrl($relativePath),
            ],
            'audio' => [
                'original_name' => $baseName.'.mp3',
                'path' => $outputRelativePath,
                'url' => $this->publicStorageApiUrl($outputRelativePath),
            ],
        ]);
    }

    public function analyzeAudio(Request $request, GeminiAudioIndexService $audioIndexService): JsonResponse
    {
        $data = $request->validate([
            'audio_path' => ['required', 'string', 'max:1024'],
        ]);

        $relativePath = $this->normalizePublicPath($data['audio_path'], 'test-audio/');

        if (! $relativePath) {
            return response()->json([
                'message' => 'La ruta del audio no es valida.',
            ], 422);
        }

        if (! Storage::disk('public')->exists($relativePath)) {
            return response()->json([
                'message' => 'El audio no existe en el servidor.',
            ], 404);
        }

        $analysis = $audioIndexService->analyzeFromAudio($relativePath);

        if (! $analysis) {
            return response()->json([
                'message' => 'No fue posible analizar el audio.',
            ], 502);
        }

        return response()->json($analysis);
    }

    private function normalizePublicPath(string $path, string $requiredPrefix): ?string
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

        if (str_starts_with($path, 'api/storage/')) {
            $path = substr($path, strlen('api/storage/'));
        }

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        if ($path === '' || str_contains($path, '..')) {
            return null;
        }

        if (! str_starts_with($path, $requiredPrefix)) {
            return null;
        }

        return $path;
    }

    private function resolveFfmpegBinary(): ?string
    {
        $candidates = array_values(array_filter(array_unique(array_merge(
            [trim((string) env('FFMPEG_PATH', ''))],
            ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', 'ffmpeg'],
        ))));

        foreach ($candidates as $binary) {
            $output = [];
            $exitCode = 0;

            exec(escapeshellcmd($binary).' -version 2>&1', $output, $exitCode);

            if ($exitCode === 0) {
                return $binary;
            }
        }

        return null;
    }

    private function publicStorageApiUrl(string $path): string
    {
        return '/api/storage/'.ltrim($path, '/');
    }
}
