<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingAudioIndexation;
use App\Models\TrainingAudioIndexationQuestion;
use App\Models\TrainingAudioIndexationTheme;
use App\Services\GeminiAudioIndexService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class VideoIndexActionController extends Controller
{
    public function showIndexation(Training $training): JsonResponse
    {
        if (! Schema::hasTable('training_audio_indexations')) {
            return response()->json([
                'training_id' => $training->id,
                'audio_path' => null,
                'audio_url' => null,
                'subtitle_url' => null,
                'subtitle_cues' => [],
                'themes' => [],
                'question_assignments' => [],
                'indexed_at' => null,
                'cached' => false,
                'result_data' => null,
            ]);
        }

        $relations = ['audioIndexation.questionAssignments.question'];
        if (Schema::hasTable('training_audio_indexation_themes')) {
            $relations[] = 'audioIndexation.themes';
        }

        $training->load($relations);

        if (! $training->audioIndexation) {
            return response()->json([
                'training_id' => $training->id,
                'audio_path' => null,
                'audio_url' => null,
                'subtitle_url' => null,
                'subtitle_cues' => [],
                'themes' => [],
                'question_assignments' => [],
                'indexed_at' => null,
                'cached' => false,
                'result_data' => null,
            ]);
        }

        $subtitlePath = $this->subtitleStoragePath($training);
        $subtitleUrl = $this->ensureSubtitleFile($training->audioIndexation->result_data ?? [], $subtitlePath);

        return response()->json([
            'training_id' => $training->id,
            'audio_path' => $training->audioIndexation->audio_path,
            'audio_url' => $this->publicStorageApiUrl($training->audioIndexation->audio_path),
            'subtitle_url' => $subtitleUrl,
            'subtitle_cues' => $this->subtitleCuesFromResultData($training->audioIndexation->result_data ?? []),
            'themes' => $this->themesFromIndexation($training->audioIndexation),
            'question_assignments' => $this->questionAssignmentsFromIndexation($training->audioIndexation),
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
                'details' => $audioIndexService->lastError(),
            ], 502);
        }

        if (! $canPersist) {
            $subtitlePath = $this->subtitleStoragePath($training);
            $subtitleUrl = $this->ensureSubtitleFile($analysis, $subtitlePath);

            return response()->json(array_merge($analysis, [
                'training_id' => $training->id,
                'audio_path' => $relativePath,
                'audio_url' => $this->publicStorageApiUrl($relativePath),
                'subtitle_url' => $subtitleUrl,
                'subtitle_cues' => $this->subtitleCuesFromResultData($analysis),
                'themes' => $this->themesFromResultData($analysis),
                'question_assignments' => [],
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

        $this->syncThemesFromResultData($indexation, $analysis);
        $training->setRelation('audioIndexation', $indexation);

        $subtitlePath = $this->subtitleStoragePath($training);
        $subtitleUrl = $this->ensureSubtitleFile($indexation->result_data ?? [], $subtitlePath);

        return response()->json(array_merge(
            $this->formatAnalysisResponse($training, $indexation, false),
            [
                'subtitle_url' => $subtitleUrl,
                'themes' => $this->themesFromIndexation($indexation),
                'question_assignments' => $this->questionAssignmentsFromIndexation($indexation),
            ]
        ));
    }

    public function indexationQuestions(Training $training): JsonResponse
    {
        if (! Schema::hasTable('training_audio_indexations')) {
            return response()->json([
                'message' => 'La indexacion no esta disponible en este entorno.',
            ], 422);
        }

        $relations = ['audioIndexation.questionAssignments.question'];
        if (Schema::hasTable('training_audio_indexation_themes')) {
            $relations[] = 'audioIndexation.themes';
        }

        $training->load($relations);

        if (! $training->audioIndexation) {
            return response()->json([
                'message' => 'La capacitacion no tiene indexacion guardada.',
            ], 404);
        }

        return response()->json([
            'training_id' => $training->id,
            'themes' => $this->themesFromIndexation($training->audioIndexation),
            'question_assignments' => $this->questionAssignmentsFromIndexation($training->audioIndexation),
        ]);
    }

    public function updateIndexationQuestions(Request $request, Training $training, int $themeOrder): JsonResponse
    {
        if (! Schema::hasTable('training_audio_indexations')) {
            return response()->json([
                'message' => 'La indexacion no esta disponible en este entorno.',
            ], 422);
        }

        if ($themeOrder <= 0) {
            return response()->json([
                'message' => 'El tema seleccionado no es valido.',
            ], 422);
        }

        $data = $request->validate([
            'question_ids' => ['required', 'array'],
            'question_ids.*' => [
                'integer',
                Rule::exists('questions', 'id')->where(fn ($query) => $query->where('training_id', $training->id)),
            ],
        ]);

        $relations = ['audioIndexation.questionAssignments.question'];
        if (Schema::hasTable('training_audio_indexation_themes')) {
            $relations[] = 'audioIndexation.themes';
        }

        $training->load($relations);

        if (! $training->audioIndexation) {
            return response()->json([
                'message' => 'La capacitacion no tiene indexacion guardada.',
            ], 404);
        }

        $availableThemeOrders = collect($this->themesFromIndexation($training->audioIndexation))
            ->pluck('theme_order')
            ->map(fn ($value) => (int) $value)
            ->all();

        if (! in_array($themeOrder, $availableThemeOrders, true)) {
            return response()->json([
                'message' => 'El tema seleccionado no existe en la indexacion.',
            ], 422);
        }

        $questionIds = collect($data['question_ids'] ?? [])
            ->map(fn ($questionId) => (int) $questionId)
            ->unique()
            ->values();

        if (Schema::hasTable('training_audio_indexation_questions')) {
            DB::transaction(function () use ($training, $themeOrder, $questionIds): void {
                TrainingAudioIndexationQuestion::query()
                    ->where('training_audio_indexation_id', $training->audioIndexation->id)
                    ->where('theme_order', $themeOrder)
                    ->delete();

                foreach ($questionIds as $sortOrder => $questionId) {
                    TrainingAudioIndexationQuestion::query()->create([
                        'training_audio_indexation_id' => $training->audioIndexation->id,
                        'question_id' => $questionId,
                        'theme_order' => $themeOrder,
                        'sort_order' => $sortOrder,
                    ]);
                }
            });
        } else {
            $resultData = $training->audioIndexation->result_data ?? [];
            $assignments = collect($this->questionAssignmentsFromResultData($resultData))
                ->keyBy('theme_order')
                ->map(fn (array $assignment): array => [
                    'theme_order' => (int) $assignment['theme_order'],
                    'question_ids' => array_values(array_map('intval', $assignment['question_ids'] ?? [])),
                ])
                ->all();

            $assignments[$themeOrder] = [
                'theme_order' => $themeOrder,
                'question_ids' => $questionIds->map(fn ($value) => (int) $value)->values()->all(),
            ];

            $resultData['question_assignments'] = array_values($assignments);

            $training->audioIndexation->update([
                'result_data' => $resultData,
            ]);
        }

        return response()->json([
            'message' => 'Preguntas asociadas correctamente al tema.',
            'question_assignments' => $this->questionAssignmentsFromIndexation($training->audioIndexation),
        ]);
    }

    public function clearIndexation(Training $training): JsonResponse
    {
        if (! Schema::hasTable('training_audio_indexations')) {
            return response()->json([
                'message' => 'La indexacion no esta disponible en este entorno.',
            ], 422);
        }

        $training->load('audioIndexation');

        if (! $training->audioIndexation) {
            return response()->json([
                'message' => 'La capacitacion no tiene indexacion guardada.',
            ], 404);
        }

        $indexation = $training->audioIndexation;

        if ($indexation->audio_path) {
            Storage::disk('public')->delete($indexation->audio_path);
        }

        Storage::disk('public')->delete($this->subtitleStoragePath($training));
        $indexation->delete();

        return response()->json([
            'message' => 'La indexacion se limpio correctamente.',
        ]);
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

    private function subtitleStoragePath(Training $training): string
    {
        return 'training-subtitles/training-'.$training->id.'.vtt';
    }

    private function ensureSubtitleFile(array $resultData, string $subtitlePath): ?string
    {
        $subtitleCues = $this->subtitleCuesFromResultData($resultData);

        if ($subtitleCues === []) {
            return null;
        }

        Storage::disk('public')->makeDirectory(dirname($subtitlePath));
        Storage::disk('public')->put($subtitlePath, $this->buildVttContent($subtitleCues));

        return $this->publicStorageApiUrl($subtitlePath);
    }

    private function buildVttContent(array $subtitleCues): string
    {
        $lines = ['WEBVTT', ''];

        $orderedCues = $subtitleCues;
        usort($orderedCues, static function (array $left, array $right): int {
            $leftStart = (float) ($left['inicio'] ?? 0);
            $rightStart = (float) ($right['inicio'] ?? 0);

            if ($leftStart !== $rightStart) {
                return $leftStart <=> $rightStart;
            }

            $leftEnd = (float) ($left['fin'] ?? 0);
            $rightEnd = (float) ($right['fin'] ?? 0);

            if ($leftEnd !== $rightEnd) {
                return $leftEnd <=> $rightEnd;
            }

            return (int) ($left['orden'] ?? 0) <=> (int) ($right['orden'] ?? 0);
        });

        foreach ($orderedCues as $cue) {
            $start = $this->formatVttTimestamp((float) ($cue['inicio'] ?? 0));
            $end = $this->formatVttTimestamp((float) ($cue['fin'] ?? 0));
            $text = $this->normalizeSubtitleText((string) ($cue['texto'] ?? ''));

            if ($text === '') {
                continue;
            }

            $lines[] = $start.' --> '.$end;
            $lines[] = $text;
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    private function subtitleCuesFromResultData(array $resultData): array
    {
        $existingCues = $resultData['subtitle_cues'] ?? [];

        if (is_array($existingCues) && $existingCues !== []) {
            return $existingCues;
        }

        $segments = $resultData['segmentos'] ?? [];
        if (! is_array($segments) || $segments === []) {
            return [];
        }

        $cues = [];
        $cueOrder = 1;

        $orderedSegments = $segments;
        usort($orderedSegments, static function (array $left, array $right): int {
            $leftStart = (float) ($left['inicio'] ?? 0);
            $rightStart = (float) ($right['inicio'] ?? 0);

            if ($leftStart !== $rightStart) {
                return $leftStart <=> $rightStart;
            }

            $leftEnd = (float) ($left['fin'] ?? 0);
            $rightEnd = (float) ($right['fin'] ?? 0);

            if ($leftEnd !== $rightEnd) {
                return $leftEnd <=> $rightEnd;
            }

            return (int) ($left['orden'] ?? 0) <=> (int) ($right['orden'] ?? 0);
        });

        foreach ($orderedSegments as $segment) {
            $start = (float) ($segment['inicio'] ?? 0);
            $end = (float) ($segment['fin'] ?? 0);
            $text = $this->normalizeSubtitleText((string) ($segment['texto'] ?? ''));

            if ($text === '') {
                $text = $this->normalizeSubtitleText((string) ($segment['resumen'] ?? ''));
            }

            if ($text === '') {
                continue;
            }

            $parts = $this->splitSubtitleText($text);
            if ($parts === []) {
                continue;
            }

            $duration = max(0.5, $end - $start);
            $weights = array_map(static fn (string $part): int => max(1, mb_strlen($part)), $parts);
            $totalWeight = max(1, array_sum($weights));
            $cursor = $start;
            $lastIndex = array_key_last($parts);

            foreach ($parts as $index => $part) {
                $share = $duration * ($weights[$index] / $totalWeight);
                $cueStart = $cursor;
                $cueEnd = $index === $lastIndex ? $end : min($end, $cursor + $share);

                if ($cueEnd <= $cueStart) {
                    $cueEnd = min($end, $cueStart + max(0.5, $duration / max(1, count($parts))));
                }

                if ($cueEnd <= $cueStart) {
                    $cueEnd = $cueStart + 0.5;
                }

                $cues[] = [
                    'orden' => $cueOrder++,
                    'inicio' => round($cueStart, 3),
                    'fin' => round($cueEnd, 3),
                    'texto' => $part,
                    'segmento_orden' => (int) ($segment['orden'] ?? 0),
                    'tema' => $this->normalizeString($segment['tema'] ?? ''),
                ];

                $cursor = $cueEnd;
            }
        }

        return $cues;
    }

    private function subtitleThemesFromResultData(array $resultData): array
    {
        return collect($this->themesFromResultData($resultData))
            ->map(fn (array $theme): array => [
                'orden' => $theme['theme_order'],
                'tema' => $theme['theme_text'],
                'inicio' => $theme['start_seconds'],
                'fin' => $theme['end_seconds'],
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{theme_order:int, theme_text:string, start_seconds:int, end_seconds:int}>
     */
    private function themesFromIndexation(TrainingAudioIndexation $indexation): array
    {
        if (Schema::hasTable('training_audio_indexation_themes')) {
            $themes = $indexation->relationLoaded('themes')
                ? $indexation->themes
                : $indexation->themes()->orderBy('theme_order')->get();

            if ($themes->isNotEmpty()) {
                return $themes
                    ->sortBy([
                        ['theme_order', 'asc'],
                        ['id', 'asc'],
                    ])
                    ->map(fn (TrainingAudioIndexationTheme $theme): array => [
                        'theme_order' => (int) $theme->theme_order,
                        'theme_text' => (string) $theme->theme_text,
                        'start_seconds' => (int) $theme->start_seconds,
                        'end_seconds' => (int) $theme->end_seconds,
                    ])
                    ->values()
                    ->all();
            }
        }

        return $this->themesFromResultData($indexation->result_data ?? []);
    }

    /**
     * @param  array<string, mixed>  $resultData
     * @return array<int, array{theme_order:int, theme_text:string, start_seconds:int, end_seconds:int}>
     */
    private function themesFromResultData(array $resultData): array
    {
        $themes = $resultData['temas_detectados'] ?? [];

        if (! is_array($themes) || $themes === []) {
            return [];
        }

        $normalizedThemes = [];

        foreach ($themes as $theme) {
            if (! is_array($theme)) {
                continue;
            }

            $themeOrder = (int) ($theme['orden'] ?? 0);
            $themeText = trim((string) ($theme['tema'] ?? ''));
            $startSeconds = (int) round((float) ($theme['inicio'] ?? 0));
            $endSeconds = (int) round((float) ($theme['fin'] ?? 0));

            if ($themeOrder <= 0 || $themeText === '' || $startSeconds < 0 || $endSeconds < $startSeconds) {
                continue;
            }

            $normalizedThemes[] = [
                'theme_order' => $themeOrder,
                'theme_text' => $themeText,
                'start_seconds' => $startSeconds,
                'end_seconds' => $endSeconds,
            ];
        }

        return $normalizedThemes;
    }

    /**
     * @param  array<int, array{theme_order:int, theme_text:string, start_seconds:int, end_seconds:int}>  $themes
     */
    private function syncThemesFromResultData(TrainingAudioIndexation $indexation, array $resultData): void
    {
        if (! Schema::hasTable('training_audio_indexation_themes')) {
            return;
        }

        $themes = $this->themesFromResultData($resultData);

        DB::transaction(function () use ($indexation, $themes): void {
            TrainingAudioIndexationTheme::query()
                ->where('training_audio_indexation_id', $indexation->id)
                ->delete();

            foreach ($themes as $theme) {
                TrainingAudioIndexationTheme::query()->create([
                    'training_audio_indexation_id' => $indexation->id,
                    'theme_order' => $theme['theme_order'],
                    'theme_text' => $theme['theme_text'],
                    'start_seconds' => $theme['start_seconds'],
                    'end_seconds' => $theme['end_seconds'],
                ]);
            }
        });

        $indexation->unsetRelation('themes');
    }

    private function questionAssignmentsFromIndexation(TrainingAudioIndexation $indexation): array
    {
        if (Schema::hasTable('training_audio_indexation_questions')) {
            $assignments = $indexation->relationLoaded('questionAssignments')
                ? $indexation->questionAssignments
                : $indexation->questionAssignments()->with('question')->get();

            if ($assignments->isNotEmpty()) {
                return $assignments
                    ->sortBy([
                        ['theme_order', 'asc'],
                        ['sort_order', 'asc'],
                        ['id', 'asc'],
                    ])
                    ->groupBy('theme_order')
                    ->map(function ($items, $themeOrder): array {
                        return [
                            'theme_order' => (int) $themeOrder,
                            'question_ids' => $items->pluck('question_id')->map(fn ($value) => (int) $value)->values()->all(),
                        ];
                    })
                    ->values()
                    ->all();
            }
        }

        return $this->questionAssignmentsFromResultData($indexation->result_data ?? []);
    }

    private function questionAssignmentsFromResultData(array $resultData): array
    {
        $assignments = $resultData['question_assignments'] ?? [];

        if (! is_array($assignments) || $assignments === []) {
            return [];
        }

        return collect($assignments)
            ->filter(fn ($assignment): bool => is_array($assignment))
            ->map(function (array $assignment): array {
                return [
                    'theme_order' => (int) ($assignment['theme_order'] ?? 0),
                    'question_ids' => collect($assignment['question_ids'] ?? [])
                        ->map(fn ($questionId) => (int) $questionId)
                        ->filter(fn (int $questionId): bool => $questionId > 0)
                        ->unique()
                        ->values()
                        ->all(),
                ];
            })
            ->filter(fn (array $assignment): bool => $assignment['theme_order'] > 0)
            ->sortBy('theme_order')
            ->values()
            ->all();
    }

    private function formatVttTimestamp(float $seconds): string
    {
        $milliseconds = (int) round($seconds * 1000);
        $hours = intdiv($milliseconds, 3600000);
        $minutes = intdiv($milliseconds % 3600000, 60000);
        $secondsPart = intdiv($milliseconds % 60000, 1000);
        $ms = $milliseconds % 1000;

        return sprintf('%02d:%02d:%02d.%03d', $hours, $minutes, $secondsPart, $ms);
    }

    private function normalizeSubtitleText(string $text): string
    {
        $text = trim($text);
        if ($text === '') {
            return '';
        }

        $text = strip_tags($text);
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
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
            'subtitle_cues' => $this->subtitleCuesFromResultData($indexation->result_data ?? []),
            'themes' => $this->themesFromIndexation($indexation),
            'question_assignments' => $this->questionAssignmentsFromIndexation($indexation),
            'indexed_at' => optional($indexation->indexed_at)->toIso8601String(),
            'cached' => $cached,
        ]);
    }
}
