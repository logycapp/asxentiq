<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingMaterial;
use App\Models\TrainingParticipant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TrainingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Training::query()
            ->withCount(['questions', 'users']);

        $search = trim((string) $request->input('search', ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('title', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('type', 'like', '%' . $search . '%')
                    ->orWhere('modality', 'like', '%' . $search . '%')
                    ->orWhere('status', 'like', '%' . $search . '%')
                    ->orWhere('location', 'like', '%' . $search . '%')
                    ->orWhere('instructor', 'like', '%' . $search . '%');
            });
        }

        $allowedSorts = [
            'id',
            'title',
            'type',
            'modality',
            'scheduled_date',
            'status',
            'questions_count',
            'users_count',
        ];

        $sortBy = $request->string('sort_by', 'scheduled_date')->toString();
        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'scheduled_date';
        }

        $sortDir = strtolower($request->string('sort_dir', 'desc')->toString()) === 'asc' ? 'asc' : 'desc';
        $perPage = max(5, min((int) $request->input('per_page', 10), 100));

        $summaryQuery = clone $query;
        $summary = [
            'total' => $summaryQuery->count(),
            'scheduled' => (clone $summaryQuery)->where('status', 'scheduled')->count(),
            'completed' => (clone $summaryQuery)->where('status', 'completed')->count(),
            'cancelled' => (clone $summaryQuery)->where('status', 'cancelled')->count(),
        ];

        $trainings = $query
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'data' => $trainings->items(),
            'meta' => [
                'current_page' => $trainings->currentPage(),
                'last_page' => $trainings->lastPage(),
                'per_page' => $trainings->perPage(),
                'total' => $trainings->total(),
                'from' => $trainings->firstItem(),
                'to' => $trainings->lastItem(),
            ],
            'summary' => $summary,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'string', 'in:medical_exam,sst_training,drill,induction'],
            'modality' => ['required', 'string', 'in:presential,virtual,mixed'],
            'scheduled_date' => ['required', 'date'],
            'completion_date' => ['nullable', 'date', 'after_or_equal:scheduled_date'],
            'duration_hours' => ['nullable', 'integer', 'min:1'],
            'location' => ['nullable', 'string', 'max:255'],
            'instructor' => ['nullable', 'string', 'max:255'],
            'mandatory' => ['boolean'],
            'status' => ['required', 'string', 'in:scheduled,completed,cancelled'],
            'passing_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $training = Training::query()->create($data);

        return response()->json([
            'message' => 'Capacitacion creada correctamente.',
            'training' => $training,
        ], 201);
    }

    public function show(Training $training): JsonResponse
    {
        $training->load(['questions.options', 'materials', 'users', 'participants']);

        return response()->json($training);
    }

    public function update(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'string', 'in:medical_exam,sst_training,drill,induction'],
            'modality' => ['required', 'string', 'in:presential,virtual,mixed'],
            'scheduled_date' => ['required', 'date'],
            'completion_date' => ['nullable', 'date', 'after_or_equal:scheduled_date'],
            'duration_hours' => ['nullable', 'integer', 'min:1'],
            'location' => ['nullable', 'string', 'max:255'],
            'instructor' => ['nullable', 'string', 'max:255'],
            'mandatory' => ['boolean'],
            'status' => ['required', 'string', 'in:scheduled,completed,cancelled'],
            'passing_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $training->update($data);

        return response()->json([
            'message' => 'Capacitacion actualizada correctamente.',
            'training' => $training->fresh()->load(['questions.options', 'materials']),
        ]);
    }

    public function destroy(Training $training): JsonResponse
    {
        // Delete associated materials from storage
        foreach ($training->materials as $material) {
            Storage::disk('public')->delete($material->filepath);
            $material->delete();
        }

        $training->delete();

        return response()->json([
            'message' => 'Capacitacion eliminada correctamente.',
        ]);
    }

    public function assignUsers(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $userIds = collect($data['user_ids'])->unique()->values();

        DB::transaction(function () use ($training, $userIds): void {
            $training->users()->syncWithoutDetaching($userIds);
        });

        return response()->json([
            'message' => 'Usuarios asignados correctamente.',
        ]);
    }

    public function removeUser(Training $training, User $user): JsonResponse
    {
        $training->users()->detach($user->id);

        return response()->json([
            'message' => 'Usuario removido de la capacitacion.',
        ]);
    }

    public function users(Training $training): JsonResponse
    {
        $users = $training->users()->with('roleRelation')->get();

        return response()->json($users);
    }

    public function assignParticipants(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'participant_ids' => ['required', 'array'],
            'participant_ids.*' => ['integer', 'exists:training_participants,id'],
        ]);

        $participantIds = collect($data['participant_ids'])->unique()->values();

        DB::transaction(function () use ($training, $participantIds): void {
            $training->participants()->syncWithoutDetaching($participantIds);
        });

        return response()->json([
            'message' => 'Participantes asignados correctamente.',
        ]);
    }

    public function removeParticipant(Training $training, TrainingParticipant $participant): JsonResponse
    {
        $training->participants()->detach($participant->id);

        return response()->json([
            'message' => 'Participante removido de la capacitacion.',
        ]);
    }

    public function participants(Training $training): JsonResponse
    {
        $participants = $training->participants;

        return response()->json($participants);
    }

    public function participantReview(Training $training, TrainingParticipant $participant): JsonResponse
    {
        $pivot = DB::table('training_participant')
            ->where('training_id', $training->id)
            ->where('training_participant_id', $participant->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'Participante no asignado a esta capacitacion.'], 404);
        }

        $questions = $training->questions()
            ->with(['options' => function ($query): void {
                $query->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        $answers = DB::table('participant_answers as pa')
            ->leftJoin('question_options as qo', 'pa.selected_option_id', '=', 'qo.id')
            ->where('pa.training_participant_id', $pivot->id)
            ->select([
                'pa.question_id',
                'pa.answer_text',
                'pa.selected_option_id',
                'pa.is_correct',
                'pa.score',
                'pa.answered_at',
                'qo.option_text as selected_option_text',
            ])
            ->get()
            ->keyBy('question_id');

        $reviewQuestions = $questions->map(function ($question) use ($answers) {
            $answer = $answers->get($question->id);

            return [
                'id' => $question->id,
                'question_text' => $question->question_text,
                'type' => $question->type,
                'order' => $question->order,
                'options' => $question->options->map(fn ($option) => [
                    'id' => $option->id,
                    'option_text' => $option->option_text,
                    'is_correct' => $option->is_correct,
                    'order' => $option->order,
                ])->values(),
                'answer' => $answer ? [
                    'answer_text' => $answer->answer_text,
                    'selected_option_id' => $answer->selected_option_id,
                    'selected_option_text' => $answer->selected_option_text,
                    'is_correct' => $answer->is_correct,
                    'score' => $answer->score,
                    'answered_at' => $answer->answered_at,
                ] : null,
            ];
        });

        return response()->json([
            'participant' => $participant,
            'pivot' => $pivot,
            'questions' => $reviewQuestions,
        ]);
    }

    public function updateParticipantReview(Request $request, Training $training, TrainingParticipant $participant): JsonResponse
    {
        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer', 'exists:questions,id'],
            'answers.*.score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'observations' => ['nullable', 'string'],
        ]);

        $pivot = DB::table('training_participant')
            ->where('training_id', $training->id)
            ->where('training_participant_id', $participant->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'Participante no asignado a esta capacitacion.'], 404);
        }

        $questions = $training->questions()->get()->keyBy('id');
        $manualQuestionIds = [];
        $existingAnswers = DB::table('participant_answers')
            ->where('training_participant_id', $pivot->id)
            ->get()
            ->keyBy('question_id');

        DB::transaction(function () use ($data, $questions, $pivot, $training, &$manualQuestionIds, $existingAnswers): void {
            foreach ($data['answers'] as $answerData) {
                $question = $questions->get($answerData['question_id']);

                if (! $question) {
                    continue;
                }

                if ($question->type !== 'open') {
                    continue;
                }

                $manualQuestionIds[] = $question->id;
                $existingAnswer = $existingAnswers->get($question->id);
                $scoreToStore = $existingAnswer && $existingAnswer->score !== null
                    ? (float) $existingAnswer->score
                    : ($answerData['score'] ?? null);

                DB::table('participant_answers')
                    ->updateOrInsert(
                        [
                            'training_participant_id' => $pivot->id,
                            'question_id' => $question->id,
                        ],
                        [
                            'score' => $scoreToStore,
                            'updated_at' => now(),
                        ]
                    );
            }

            $answerScores = DB::table('participant_answers')
                ->where('training_participant_id', $pivot->id)
                ->pluck('score');

            $totalQuestions = $training->questions()->count();
            $finalScore = $answerScores->count() === $totalQuestions && ! $answerScores->contains(fn ($value): bool => $value === null)
                ? round((float) $answerScores->avg(), 2)
                : null;
            $finalPassed = $pivot->passed !== null
                ? (bool) $pivot->passed
                : ($finalScore !== null ? $finalScore >= $training->passing_score : null);

            DB::table('training_participant')
                ->where('id', $pivot->id)
                ->update([
                    'attended' => $pivot->attended ?? true,
                    'score' => $finalScore,
                    'passed' => $finalPassed,
                    'observations' => $data['observations'] ?? null,
                    'completed_at' => $pivot->completed_at ?? now(),
                    'updated_at' => now(),
                ]);
        });

        return response()->json([
            'message' => 'Revision guardada correctamente.',
            'reviewed_questions' => count($manualQuestionIds),
        ]);
    }

    public function resetParticipantAttempt(Training $training, TrainingParticipant $participant): JsonResponse
    {
        $pivot = DB::table('training_participant')
            ->where('training_id', $training->id)
            ->where('training_participant_id', $participant->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'Participante no asignado a esta capacitacion.'], 404);
        }

        DB::transaction(function () use ($pivot): void {
            DB::table('participant_answers')
                ->where('training_participant_id', $pivot->id)
                ->delete();

            DB::table('training_participant')
                ->where('id', $pivot->id)
                ->update([
                    'attended' => null,
                    'score' => null,
                    'observations' => null,
                    'attendance_date' => null,
                    'completed_at' => null,
                    'updated_at' => now(),
                ]);
        });

        return response()->json([
            'message' => 'Intento del participante reiniciado correctamente.',
        ]);
    }

    public function uploadMaterial(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:51200'], // 50MB max
            'type' => ['required', 'string', 'in:video,pdf,spreadsheet,other'],
        ]);

        $file = $request->file('file');
        $filename = $file->getClientOriginalName();
        $filepath = $file->store('trainings/' . $training->id, 'public');

        $material = $training->materials()->create([
            'filename' => $filename,
            'filepath' => $filepath,
            'mime_type' => $file->getMimeType(),
            'filesize' => $file->getSize(),
            'type' => $data['type'],
        ]);

        return response()->json([
            'message' => 'Material subido correctamente.',
            'material' => $material,
        ], 201);
    }

    public function deleteMaterial(Training $training, TrainingMaterial $material): JsonResponse
    {
        if ($material->trainable_type !== Training::class || $material->trainable_id !== $training->id) {
            return response()->json(['message' => 'Material no pertenece a esta capacitacion.'], 403);
        }

        Storage::disk('public')->delete($material->filepath);
        $material->delete();

        return response()->json([
            'message' => 'Material eliminado correctamente.',
        ]);
    }
}
