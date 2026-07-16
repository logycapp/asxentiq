<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingAudioIndexation;
use App\Services\GeminiAudioIndexService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class VideoIndexActionController extends Controller
{
    public function showIndexation(Training $training): JsonResponse
    {
        if (! Schema::hasTable('training_audio_indexations')) {
            return response()->json([
                'training_id' => $training->id,
                'audio_path' => null,
                'audio_url' => null,
                'indexed_at' => null,
                'cached' => false,
                'result_data' => null,
            ]);
        }

        $training->load('audioIndexation');

        if (! $training->audioIndexation) {
            return response()->json([
                'training_id' => $training->id,
                'audio_path' => null,
                'audio_url' => null,
                'indexed_at' => null,
                'cached' => false,
                'result_data' => null,
            ]);
        }

        return response()->json([
            'training_id' => $training->id,
            'audio_path' => $training->audioIndexation->audio_path,
            'audio_url' => $this->publicStorageApiUrl($training->audioIndexation->audio_path),
            'indexed_at' => optional($training->audioIndexation->indexed_at)->toIso8601String(),
            'cached' => true,
            'result_data' => $training->audioIndexation->result_data,
        ]);
    }

    public function extractAudio(Request $request): JsonResponse
    {
        $data = $request->validate([
            'video_path' => ['required', 'string', 'max:1024'],
        ]);

        $relativePath = $this->normalizePublicPath($data['video_path'], ['trainings/']);

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

        $audioDirectory = 'training-audio';
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

    public function analyzeAudio(
        Request $request,
        Training $training,
        GeminiAudioIndexService $audioIndexService
    ): JsonResponse
    {
        $data = $request->validate([
            'audio_path' => ['required', 'string', 'max:1024'],
        ]);

        $relativePath = $this->normalizePublicPath($data['audio_path'], ['training-audio/']);

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

        $canPersist = Schema::hasTable('training_audio_indexations');
        $existingIndexation = $canPersist ? $training->audioIndexation : null;

        if ($existingIndexation && $existingIndexation->audio_path === $relativePath) {
            return response()->json($this->formatAnalysisResponse($training, $existingIndexation, true));
        }

        $analysis = $audioIndexService->analyzeFromAudio($relativePath);

        if (! $analysis) {
            return response()->json([
                'message' => 'No fue posible analizar el audio.',
            ], 502);
        }

        if (! $canPersist) {
            return response()->json(array_merge($analysis, [
                'training_id' => $training->id,
                'audio_path' => $relativePath,
                'audio_url' => $this->publicStorageApiUrl($relativePath),
                'indexed_at' => null,
                'cached' => false,
            ]));
        }

        $indexation = TrainingAudioIndexation::query()->updateOrCreate(
            ['training_id' => $training->id],
            [
                'audio_path' => $relativePath,
                'result_data' => $analysis,
                'indexed_at' => Carbon::now(),
            ]
        );

        $training->setRelation('audioIndexation', $indexation);

        return response()->json($this->formatAnalysisResponse($training, $indexation, false));
    }

    private function normalizePublicPath(string $path, array|string $requiredPrefixes): ?string
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

        $prefixes = is_array($requiredPrefixes) ? $requiredPrefixes : [$requiredPrefixes];

        foreach ($prefixes as $requiredPrefix) {
            if (str_starts_with($path, $requiredPrefix)) {
                return $path;
            }
        }

        return null;
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
        return rtrim(request()->getSchemeAndHttpHost(), '/').'/api/storage/'.ltrim($path, '/');
    }

    private function formatAnalysisResponse(
        Training $training,
        TrainingAudioIndexation $indexation,
        bool $cached
    ): array {
        return array_merge($indexation->result_data ?? [], [
            'training_id' => $training->id,
            'audio_path' => $indexation->audio_path,
            'audio_url' => $this->publicStorageApiUrl($indexation->audio_path),
            'indexed_at' => optional($indexation->indexed_at)->toIso8601String(),
            'cached' => $cached,
        ]);
    }
}
