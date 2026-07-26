<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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

        $participant = TrainingParticipant::query()
            ->where('document_number', $data['document_number'])
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
                $q->where('document_number', $documentNumber)->whereNull('completed_at');
            })
            ->with('category')
            ->with(['participants' => function ($q) use ($documentNumber): void {
                $q->where('document_number', $documentNumber);
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
                $q->where('document_number', $documentNumber)->whereNotNull('completed_at');
            })
            ->with('category')
            ->with(['participants' => function ($q) use ($documentNumber): void {
                $q->where('document_number', $documentNumber);
            }])
            ->orderBy('scheduled_date', 'desc')
            ->get();

        return response()->json($trainings);
    }

    public function take(Training $training, Request $request): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = $training->participants()->where('document_number', $documentNumber)->first();

        if (! $participant) {
            return response()->json(['message' => 'No estas asignado a esta capacitacion.'], 403);
        }

        if ($participant->completed_at) {
            return response()->json(['message' => 'Ya completaste esta capacitacion.'], 422);
        }

        $training->load(['category', 'questions' => function ($q): void {
            $q->where('type', '!=', 'open');
            $q->with(['options' => function ($opt): void {
                $opt->select(['id', 'question_id', 'option_text', 'order']);
            }, 'materials'])->orderBy('order');
        }, 'materials']);

        return response()->json($training);
    }

    public function submit(Request $request, Training $training): JsonResponse
    {
        $documentNumber = $this->getParticipantDocument($request);
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = $training->participants()->where('document_number', $documentNumber)->first();

        if (! $participant || $participant->completed_at) {
            return response()->json(['message' => 'No puedes enviar respuestas para esta capacitacion.'], 422);
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

            $participant->update([
                'score' => $score,
                'passed' => $score !== null ? $score >= $training->passing_score : null,
                'attended' => true,
                'attendance_date' => now()->toDateString(),
                'completed_at' => now(),
            ]);
        });

        return response()->json([
            'message' => 'Respuestas enviadas correctamente.',
            'score' => $participant->fresh()->score,
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

        $participant = $training->participants()->where('document_number', $documentNumber)->first();

        if (! $participant || ! $participant->completed_at) {
            return response()->json(['message' => 'No has completado esta capacitacion.'], 422);
        }

        $training->load(['category', 'questions' => function ($q): void {
            $q->where('type', '!=', 'open')->orderBy('order');
        }]);

        $passed = $participant->passed !== null
            ? (bool) $participant->passed
            : ($participant->score !== null ? $participant->score >= $training->passing_score : null);

        return response()->json([
            'training' => $training,
            'score' => $participant->score,
            'passed' => $passed,
            'completed_at' => $participant->completed_at,
        ]);
    }
}
