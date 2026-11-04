<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;

class PublicTrainingController extends Controller
{
    private function getParticipantDocument(Request $request): ?string
    {
        $token = $request->bearerToken();
        if (!$token || !str_starts_with($token, 'participant_')) {
            return null;
        }

        return Cache::get('pt_' . $token);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_number' => ['required', 'string', 'max:20'],
        ]);

        $privacyConsentAcceptedAt = TrainingParticipant::query()
            ->where('document_number', $data['document_number'])
            ->whereNotNull('privacy_consent_accepted_at')
            ->max('privacy_consent_accepted_at');

        $participant = TrainingParticipant::query()
            ->where('document_number', $data['document_number'])
            ->when(Schema::hasColumn('training_participants', 'active'), function ($query): void {
                $query->where('active', true);
            })
            ->orderByDesc('updated_at')
            ->first();

        if (!$participant) {
            return response()->json(['message' => 'Numero de documento no registrado como participante.'], 404);
        }

        $token = 'participant_' . $participant->document_number . '_' . bin2hex(random_bytes(16));

        Cache::put('pt_' . $token, $participant->document_number, now()->addHours(24));

        return response()->json([
            'token' => $token,
            'role' => 'participant',
            'user' => [
                'id' => $participant->id,
                'name' => $participant->full_name,
                'document_number' => $participant->document_number,
                'privacy_consent_accepted_at' => $privacyConsentAcceptedAt,
            ],
        ]);
    }

    public function acceptPrivacyConsent(Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        TrainingParticipant::query()
            ->where('document_number', $documentNumber)
            ->update([
                'privacy_consent_accepted_at' => now(),
            ]);

        $participant = TrainingParticipant::query()
            ->where('document_number', $documentNumber)
            ->orderByDesc('updated_at')
            ->first();

        return response()->json([
            'user' => [
                'id' => $participant?->id,
                'name' => $participant?->full_name,
                'document_number' => $participant?->document_number,
                'privacy_consent_accepted_at' => $participant?->privacy_consent_accepted_at?->toISOString() ?? now()->toISOString(),
            ],
        ]);
    }

    public function pending(Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $trainings = Training::query()
            ->whereHas('participants', function ($q) use ($documentNumber): void {
                $q->where('document_number', $documentNumber);

                if (Schema::hasColumn('training_participants', 'active')) {
                    $q->where('active', true);
                }

                $q->where(function ($attemptQuery): void {
                    $attemptQuery->whereRaw(
                        'not exists (select 1 from participant_answers pa where pa.training_participant_id = training_participants.id)'
                    );

                    if (Schema::hasColumn('training_participants', 'attempt_started_at')) {
                        $attemptQuery->orWhereNotNull('training_participants.attempt_started_at');
                    }

                    if (Schema::hasColumn('trainings', 'max_attempts') && Schema::hasColumn('training_participants', 'attempts_count')) {
                        $attemptQuery->orWhereRaw('COALESCE(training_participants.attempts_count, 0) < COALESCE(trainings.max_attempts, 1)');
                    }
                });
            })
            ->with('category.empresa')
            ->with(['participants' => function ($q) use ($documentNumber): void {
                $q->where('document_number', $documentNumber);

                if (Schema::hasColumn('training_participants', 'active')) {
                    $q->where('active', true);
                }
            }])
            ->withCount([
                'questions as questions_count' => function ($query): void {
                    $query->where('type', '!=', 'open');
                },
            ])
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($trainings);
    }

    public function completed(Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $trainings = Training::query()
            ->whereHas('participants', function ($q) use ($documentNumber): void {
                $q->where('document_number', $documentNumber);

                if (Schema::hasColumn('training_participants', 'active')) {
                    $q->where('active', true);
                }

                $q->whereRaw(
                    'exists (select 1 from participant_answers pa where pa.training_participant_id = training_participants.id)'
                );
            })
            ->with('category.empresa')
            ->with(['participants' => function ($q) use ($documentNumber): void {
                $q->where('document_number', $documentNumber);

                if (Schema::hasColumn('training_participants', 'active')) {
                    $q->where('active', true);
                }
            }])
            ->orderBy('scheduled_date', 'desc')
            ->get();

        return response()->json($trainings);
    }

    public function begin(Training $training, Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = $training->participants()
            ->where('document_number', $documentNumber)
            ->where('active', true)
            ->first();

        if (! $participant) {
            return response()->json(['message' => 'No estas asignado a esta capacitacion.'], 403);
        }

        if (! $this->isAttemptInProgress($participant) && ! $this->hasAttemptsRemaining($training, $participant)) {
            return response()->json(['message' => 'Ya agotaste los intentos disponibles para esta capacitacion.'], 422);
        }

        if (! $this->isAttemptInProgress($participant)) {
            DB::transaction(function () use ($participant): void {
                DB::table('participant_answers')
                    ->where('training_participant_id', $participant->id)
                    ->delete();

                $updates = [];

                foreach (['attended', 'score', 'passed', 'observations', 'attendance_date', 'completed_at'] as $column) {
                    if (Schema::hasColumn('training_participants', $column)) {
                        $updates[$column] = null;
                    }
                }

                if (Schema::hasColumn('training_participants', 'attempt_started_at')) {
                    $updates['attempt_started_at'] = now();
                }

                if (Schema::hasColumn('training_participants', 'attempts_count')) {
                    $updates['attempts_count'] = ($participant->attempts_count ?? 0) + 1;
                }

                if ($updates !== []) {
                    $participant->update($updates);
                }
            });

            $participant = $participant->fresh();
        }

        $training->setAttribute('attempt_in_progress', $this->isAttemptInProgress($participant));

        $relations = ['category', 'questions' => function ($q): void {
            $q->where('type', '!=', 'open');
            $q->with(['options' => function ($opt): void {
                $opt->select(['id', 'question_id', 'option_text', 'order']);
            }, 'materials'])->orderBy('order');
        }, 'materials'];

        if (Schema::hasTable('training_audio_indexations')) {
            if (Schema::hasTable('training_audio_indexation_themes')) {
                $relations[] = 'audioIndexation.themes';
            }
            $relations[] = 'audioIndexation.questionAssignments.question';
        }

        $training->load($relations);

        if ($training->audioIndexation) {
            $resultData = $training->audioIndexation->result_data ?? [];
            $subtitleUrl = $this->ensureSubtitleFile(
                $resultData,
                $this->subtitleStoragePath($training)
            );
            $subtitleCues = $this->subtitleCuesFromResultData($resultData);
            $themes = $this->themesFromResultData($resultData);

            $training->setAttribute('subtitle_url', $subtitleUrl);
            $training->setAttribute('subtitle_cues', $subtitleCues);
            $training->setAttribute('themes', $themes);
            $training->audioIndexation->setAttribute('subtitle_url', $subtitleUrl);
            $training->audioIndexation->setAttribute('subtitle_cues', $subtitleCues);
            $training->audioIndexation->setAttribute('themes', $themes);
        }

        return response()->json($training);
    }

    public function take(Training $training, Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = $training->participants()
            ->where('document_number', $documentNumber)
            ->where('active', true)
            ->first();

        if (! $participant) {
            return response()->json(['message' => 'No estas asignado a esta capacitacion.'], 403);
        }

        if (! $this->isAttemptInProgress($participant) && ! $this->hasAttemptsRemaining($training, $participant)) {
            return response()->json(['message' => 'Ya agotaste los intentos disponibles para esta capacitacion.'], 422);
        }

        if (! $this->isAttemptInProgress($participant)) {
            DB::transaction(function () use ($participant): void {
                DB::table('participant_answers')
                    ->where('training_participant_id', $participant->id)
                    ->delete();

                $updates = [];

                foreach (['attended', 'score', 'passed', 'observations', 'attendance_date', 'completed_at'] as $column) {
                    if (Schema::hasColumn('training_participants', $column)) {
                        $updates[$column] = null;
                    }
                }

                if (Schema::hasColumn('training_participants', 'attempt_started_at')) {
                    $updates['attempt_started_at'] = now();
                }

                if (Schema::hasColumn('training_participants', 'attempts_count')) {
                    $updates['attempts_count'] = ($participant->attempts_count ?? 0) + 1;
                }

                if ($updates !== []) {
                    $participant->update($updates);
                }
            });

            $participant = $participant->fresh();
        }

        $relations = ['category', 'questions' => function ($q): void {
            $q->where('type', '!=', 'open');
            $q->with(['options' => function ($opt): void {
                $opt->select(['id', 'question_id', 'option_text', 'order']);
            }, 'materials'])->orderBy('order');
        }, 'materials'];

        if (Schema::hasTable('training_audio_indexations')) {
            if (Schema::hasTable('training_audio_indexation_themes')) {
                $relations[] = 'audioIndexation.themes';
            }
            $relations[] = 'audioIndexation.questionAssignments.question';
        }

        $training->load($relations);

        if ($training->audioIndexation) {
            $resultData = $training->audioIndexation->result_data ?? [];
            $subtitleUrl = $this->ensureSubtitleFile(
                $resultData,
                $this->subtitleStoragePath($training)
            );
            $subtitleCues = $this->subtitleCuesFromResultData($resultData);

            $training->setAttribute('subtitle_url', $subtitleUrl);
            $training->setAttribute('subtitle_cues', $subtitleCues);
            $training->audioIndexation->setAttribute('subtitle_url', $subtitleUrl);
            $training->audioIndexation->setAttribute('subtitle_cues', $subtitleCues);
        }

        $training->setAttribute('attempt_in_progress', $this->isAttemptInProgress($participant));

        if ($training->audioIndexation) {
            $resultData = $training->audioIndexation->result_data ?? [];
            $subtitleUrl = $this->ensureSubtitleFile(
                $resultData,
                $this->subtitleStoragePath($training)
            );
            $subtitleCues = $this->subtitleCuesFromResultData($resultData);
            $themes = $this->themesFromResultData($resultData);

            $training->setAttribute('subtitle_url', $subtitleUrl);
            $training->setAttribute('subtitle_cues', $subtitleCues);
            $training->setAttribute('themes', $themes);
            $training->audioIndexation->setAttribute('subtitle_url', $subtitleUrl);
            $training->audioIndexation->setAttribute('subtitle_cues', $subtitleCues);
            $training->audioIndexation->setAttribute('themes', $themes);
        }

        return response()->json($training);
    }

    public function submit(Request $request, Training $training): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = $training->participants()
            ->where('document_number', $documentNumber)
            ->where('active', true)
            ->first();

        if (! $participant || ! $this->isAttemptInProgress($participant)) {
            return response()->json(['message' => 'Debes iniciar el examen primero.'], 422);
        }

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer', 'exists:questions,id'],
            'answers.*.answer_text' => ['nullable', 'string'],
            'answers.*.selected_option_id' => ['nullable', 'integer', 'exists:question_options,id'],
        ]);

        $questions = $training->questions()
            ->where('type', '!=', 'open')
            ->with('options')
            ->get()
            ->keyBy('id');
        $totalQuestions = $questions->count();
        $correctAnswers = 0;
        $autogradeQuestions = 0;

        DB::transaction(function () use ($training, $participant, $data, $questions, &$correctAnswers, &$autogradeQuestions): void {

            foreach ($data['answers'] as $answerData) {
                $question = $questions->get($answerData['question_id']);

                if (!$question) {
                    continue;
                }

                $isCorrect = null;
                $questionScore = null;

                if ($question->type === 'multiple_choice' && isset($answerData['selected_option_id'])) {
                    $selectedOption = $question->options->firstWhere('id', $answerData['selected_option_id']);
                    $isCorrect = $selectedOption && $selectedOption->is_correct;
                    $questionScore = $isCorrect ? 100 : 0;
                    $autogradeQuestions++;
                    if ($isCorrect) {
                        $correctAnswers++;
                    }
                } elseif ($question->type === 'yes_no') {
                    $correctOption = $question->options()->where('is_correct', true)->first();
                    $selectedOption = $question->options()->find($answerData['selected_option_id']);
                    $isCorrect = $selectedOption && $correctOption && $selectedOption->id === $correctOption->id;
                    $questionScore = $isCorrect ? 100 : 0;
                    $autogradeQuestions++;
                    if ($isCorrect) {
                        $correctAnswers++;
                    }
                }

                DB::table('participant_answers')->updateOrInsert(
                    [
                        'training_participant_id' => $participant->id,
                        'question_id' => $question->id,
                    ],
                    [
                        'answer_text' => $answerData['answer_text'] ?? null,
                        'selected_option_id' => $answerData['selected_option_id'] ?? null,
                        'is_correct' => $isCorrect,
                        'score' => $questionScore,
                        'answered_at' => now(),
                    ]
                );
            }

            $answerScores = DB::table('participant_answers')
                ->where('training_participant_id', $participant->id)
                ->whereIn('question_id', $questions->keys())
                ->pluck('score');

            $score = $answerScores->count() === $questions->count() && ! $answerScores->contains(fn ($value): bool => $value === null)
                ? round((float) $answerScores->avg(), 2)
                : null;

            $updates = [];

            if (Schema::hasColumn('training_participants', 'score')) {
                $updates['score'] = $score;
            }

            if (Schema::hasColumn('training_participants', 'passed')) {
                $updates['passed'] = $score !== null ? $score >= $training->passing_score : null;
            }

            if (Schema::hasColumn('training_participants', 'attended')) {
                $updates['attended'] = true;
            }

            if (Schema::hasColumn('training_participants', 'attendance_date')) {
                $updates['attendance_date'] = now()->toDateString();
            }

            if (Schema::hasColumn('training_participants', 'completed_at')) {
                $updates['completed_at'] = now();
            }

            if (Schema::hasColumn('training_participants', 'attempt_started_at')) {
                $updates['attempt_started_at'] = null;
            }

            if ($updates !== []) {
                $participant->update($updates);
            }
        });

        return response()->json([
            'message' => 'Respuestas enviadas correctamente.',
            'score' => $this->resolveParticipantScore($training, $participant) ?? $participant->fresh()->score,
            'total_questions' => $totalQuestions,
            'autograded' => $autogradeQuestions,
            'correct' => $correctAnswers,
        ]);
    }

    public function result(Training $training, Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = $training->participants()
            ->where('document_number', $documentNumber)
            ->where('active', true)
            ->first();

        if (! $participant || ! $this->hasCompletedTraining($training, $participant)) {
            return response()->json(['message' => 'No has completado esta capacitacion.'], 422);
        }

        $training->load(['category', 'questions' => function ($q): void {
            $q->where('type', '!=', 'open')->orderBy('order');
        }]);

        $score = $participant->score ?? $this->resolveParticipantScore($training, $participant);
        $passed = $participant->passed !== null
            ? (bool) $participant->passed
            : ($score !== null ? $score >= $training->passing_score : null);
        $completedAt = $participant->completed_at ?? $this->resolveParticipantCompletedAt($participant);

        return response()->json([
            'training' => $training,
            'score' => $score,
            'passed' => $passed,
            'completed_at' => $completedAt,
        ]);
    }

    private function resolveParticipantScore(Training $training, TrainingParticipant $participant): ?float
    {
        $questionIds = $training->questions()
            ->where('type', '!=', 'open')
            ->pluck('id');

        if ($questionIds->isEmpty()) {
            return null;
        }

        $answerScores = DB::table('participant_answers')
            ->where('training_participant_id', $participant->id)
            ->whereIn('question_id', $questionIds)
            ->pluck('score');

        if ($answerScores->count() !== $questionIds->count() || $answerScores->contains(fn ($value): bool => $value === null)) {
            return null;
        }

        return round((float) $answerScores->avg(), 2);
    }

    private function resolveParticipantCompletedAt(TrainingParticipant $participant): ?string
    {
        return DB::table('participant_answers')
            ->where('training_participant_id', $participant->id)
            ->max('answered_at');
    }

    private function hasCompletedTraining(Training $training, TrainingParticipant $participant): bool
    {
        return DB::table('participant_answers')
            ->where('training_participant_id', $participant->id)
            ->exists();
    }

    private function hasAttemptsRemaining(Training $training, TrainingParticipant $participant): bool
    {
        $maxAttempts = 1;

        if (Schema::hasColumn('trainings', 'max_attempts')) {
            $maxAttempts = max((int) ($training->max_attempts ?? 1), 1);
        }

        $attemptsUsed = 0;
        if (Schema::hasColumn('training_participants', 'attempts_count')) {
            $attemptsUsed = max((int) ($participant->attempts_count ?? 0), 0);
        }

        return $attemptsUsed < $maxAttempts;
    }

    /**
     * @return array<int, array{orden:int, tema:string, inicio:int, fin:int}>
     */
    private function themesFromResultData(array $resultData): array
    {
        $themes = $resultData['temas_detectados'] ?? [];

        if (! is_array($themes) || $themes === []) {
            return [];
        }

        $normalized = [];

        foreach ($themes as $index => $theme) {
            if (! is_array($theme)) {
                continue;
            }

            $orden = (int) ($theme['orden'] ?? $index + 1);
            $tema = trim((string) ($theme['tema'] ?? ''));
            $inicio = (int) round((float) ($theme['inicio'] ?? 0));
            $fin = (int) round((float) ($theme['fin'] ?? 0));

            if ($orden <= 0 || $tema === '' || $fin < $inicio) {
                continue;
            }

            $normalized[] = [
                'orden' => $orden,
                'tema' => $tema,
                'inicio' => $inicio,
                'fin' => $fin,
            ];
        }

        return $normalized;
    }

    private function isAttemptInProgress(TrainingParticipant $participant): bool
    {
        if (! Schema::hasColumn('training_participants', 'attempt_started_at')) {
            return false;
        }

        return $participant->attempt_started_at !== null && $participant->completed_at === null;
    }

    private function publicStorageApiUrl(string $path): string
    {
        return '/api/storage/'.ltrim($path, '/');
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

    private function subtitleCuesFromResultData(array $resultData): array
    {
        $existingCues = $resultData['subtitle_cues'] ?? [];

        if (is_array($existingCues) && $existingCues !== []) {
            return collect($existingCues)
                ->filter(fn ($cue): bool => is_array($cue))
                ->map(function (array $cue): array {
                    return [
                        'orden' => (int) ($cue['orden'] ?? 0),
                        'inicio' => (float) ($cue['inicio'] ?? 0),
                        'fin' => (float) ($cue['fin'] ?? 0),
                        'texto' => $this->normalizeSubtitleText((string) ($cue['texto'] ?? '')),
                    ];
                })
                ->filter(fn (array $cue): bool => $cue['inicio'] >= 0 && $cue['fin'] > $cue['inicio'] && $cue['texto'] !== '')
                ->sortBy([
                    ['inicio', 'asc'],
                    ['fin', 'asc'],
                    ['orden', 'asc'],
                ])
                ->values()
                ->all();
        }

        $segments = $resultData['segmentos'] ?? [];
        if (! is_array($segments) || $segments === []) {
            return [];
        }

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

        $cues = [];
        $cueOrder = 1;

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
                ];

                $cursor = $cueEnd;
            }
        }

        return $cues;
    }

    private function buildVttContent(array $subtitleCues): string
    {
        $lines = ['WEBVTT', ''];

        foreach ($subtitleCues as $cue) {
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

    private function splitSubtitleText(string $text): array
    {
        $text = $this->normalizeSubtitleText($text);

        if ($text === '') {
            return [];
        }

        $parts = preg_split('/(?<=[.!?])\s+|[\r\n]+/u', $text) ?: [];

        return array_values(array_filter(array_map(static fn (string $part): string => trim($part), $parts), static fn (string $part): bool => $part !== ''));
    }
}
