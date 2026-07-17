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
    private function getParticipantId(Request $request): ?int
    {
        $token = $request->bearerToken();
        if (!$token || !str_starts_with($token, 'participant_')) {
            return null;
        }

        $parts = explode('_', $token);
        return isset($parts[1]) ? (int) $parts[1] : null;
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_number' => ['required', 'string', 'max:20'],
        ]);

        $participant = TrainingParticipant::query()->where('document_number', $data['document_number'])->first();

        if (!$participant) {
            return response()->json(['message' => 'Numero de documento no registrado como participante.'], 404);
        }

        $token = 'participant_' . $participant->id . '_' . bin2hex(random_bytes(16));

        Cache::put('pt_' . $token, $participant->id, now()->addHours(24));

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
        $participantId = $this->getParticipantId($request);
        if (!$participantId) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $trainings = Training::query()
            // La visibilidad del examen publico debe depender de la asignacion del participante
            // y no del estado global de la capacitacion.
            ->whereHas('participants', function ($q) use ($participantId): void {
                $q->where('training_participant_id', $participantId)->whereNull('completed_at');
            })
            ->with('category')
            ->withCount('questions')
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($trainings);
    }

    public function completed(Request $request): JsonResponse
    {
        $participantId = $this->getParticipantId($request);
        if (!$participantId) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $trainings = Training::query()
            ->whereHas('participants', function ($q) use ($participantId): void {
                $q->where('training_participant_id', $participantId)->whereNotNull('completed_at');
            })
            ->with('category')
            ->with(['participants' => function ($q) use ($participantId): void {
                $q->where('training_participant_id', $participantId);
            }])
            ->orderBy('scheduled_date', 'desc')
            ->get();

        return response()->json($trainings);
    }

    public function take(Training $training, Request $request): JsonResponse
    {
        $participantId = $this->getParticipantId($request);
        if (!$participantId) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $pivot = $training->participants()->where('training_participant_id', $participantId)->first();

        if (!$pivot) {
            return response()->json(['message' => 'No estas asignado a esta capacitacion.'], 403);
        }

        if ($pivot->pivot->completed_at) {
            return response()->json(['message' => 'Ya completaste esta capacitacion.'], 422);
        }

        $training->load(['category', 'questions' => function ($q): void {
            $q->with(['options' => function ($opt): void {
                $opt->select(['id', 'question_id', 'option_text', 'order']);
            }, 'materials'])->orderBy('order');
        }, 'materials']);

        return response()->json($training);
    }

    public function submit(Request $request, Training $training): JsonResponse
    {
        $participantId = $this->getParticipantId($request);
        if (!$participantId) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $pivot = $training->participants()->where('training_participant_id', $participantId)->first();

        if (!$pivot || $pivot->pivot->completed_at) {
            return response()->json(['message' => 'No puedes enviar respuestas para esta capacitacion.'], 422);
        }

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer', 'exists:questions,id'],
            'answers.*.answer_text' => ['nullable', 'string'],
            'answers.*.selected_option_id' => ['nullable', 'integer', 'exists:question_options,id'],
        ]);

        $questions = $training->questions()->with('options')->get()->keyBy('id');
        $totalQuestions = $questions->count();
        $correctAnswers = 0;
        $autogradeQuestions = 0;

        // Note: Since user_answers currently links to training_user pivot,
        // we'll store answers using the participant pivot ID
        // For now, we link to the participant's training_participant row
        $trainingParticipantPivot = DB::table('training_participant')
            ->where('training_id', $training->id)
            ->where('training_participant_id', $participantId)
            ->first();

        DB::transaction(function () use ($training, $participantId, $data, $questions, &$correctAnswers, &$autogradeQuestions, $trainingParticipantPivot): void {

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
                        'training_participant_id' => $trainingParticipantPivot->id,
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
                ->where('training_participant_id', $trainingParticipantPivot->id)
                ->pluck('score');

            $score = $answerScores->count() === $questions->count() && ! $answerScores->contains(fn ($value): bool => $value === null)
                ? round((float) $answerScores->avg(), 2)
                : null;

                DB::table('training_participant')
                ->where('id', $trainingParticipantPivot->id)
                ->update([
                    'score' => $score,
                    'passed' => $score !== null ? $score >= $training->passing_score : null,
                    'attended' => true,
                    'attendance_date' => now()->toDateString(),
                    'completed_at' => now(),
                ]);
        });

        return response()->json([
            'message' => 'Respuestas enviadas correctamente.',
            'score' => DB::table('training_participant')
                ->where('id', $trainingParticipantPivot->id)
                ->value('score'),
            'total_questions' => $totalQuestions,
            'autograded' => $autogradeQuestions,
            'correct' => $correctAnswers,
        ]);
    }

    public function result(Training $training, Request $request): JsonResponse
    {
        $participantId = $this->getParticipantId($request);
        if (!$participantId) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $pivot = $training->participants()->where('training_participant_id', $participantId)->first();

        if (!$pivot || !$pivot->pivot->completed_at) {
            return response()->json(['message' => 'No has completado esta capacitacion.'], 422);
        }

        $training->load(['category', 'questions']);

        $passed = $pivot->pivot->passed !== null
            ? (bool) $pivot->pivot->passed
            : ($pivot->pivot->score !== null ? $pivot->pivot->score >= $training->passing_score : null);

        return response()->json([
            'training' => $training,
            'score' => $pivot->pivot->score,
            'passed' => $passed,
            'completed_at' => $pivot->pivot->completed_at,
        ]);
    }
}
