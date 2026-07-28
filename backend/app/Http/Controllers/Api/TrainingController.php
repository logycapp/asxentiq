<?php

namespace App\Http\Controllers\Api;

use App\Exports\TrainingParticipantsExport;
use App\Exports\TrainingParticipantsDetailedExport;
use App\Http\Controllers\Controller;
use App\Imports\TrainingParticipantsImport;
use App\Models\Training;
use App\Models\TrainingMaterial;
use App\Models\TrainingParticipant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class TrainingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Training::query()
            ->with('category')
            ->withCount(['questions', 'users']);

        $categoryId = (int) $request->input('training_category_id', 0);
        if ($categoryId > 0) {
            $query->where('training_category_id', $categoryId);
        }

        $search = trim((string) $request->input('search', ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('title', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('modality', 'like', '%' . $search . '%')
                    ->orWhere('status', 'like', '%' . $search . '%')
                    ->orWhere('location', 'like', '%' . $search . '%')
                    ->orWhere('instructor', 'like', '%' . $search . '%')
                    ->orWhereHas('category', function ($categoryQuery) use ($search): void {
                        $categoryQuery->where('name', 'like', '%' . $search . '%')
                            ->orWhere('description', 'like', '%' . $search . '%');
                    });
            });
        }

        $allowedSorts = [
            'id',
            'training_category_id',
            'title',
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

    public function dashboardStats(): JsonResponse
    {
        $trainings = Training::query()
            ->withCount(['questions', 'users', 'participants'])
            ->get();

        return response()->json([
            'total' => $trainings->count(),
            'scheduled' => $trainings->where('status', 'scheduled')->count(),
            'completed' => $trainings->where('status', 'completed')->count(),
            'cancelled' => $trainings->where('status', 'cancelled')->count(),
            'questions_total' => $trainings->sum('questions_count'),
            'users_total' => $trainings->sum('users_count'),
            'participants_total' => $trainings->sum('participants_count'),
            'with_questions' => $trainings->filter(fn (Training $training): bool => (int) ($training->questions_count ?? 0) > 0)->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'training_category_id' => ['required', 'integer', 'exists:training_categories,id'],
            'description' => ['nullable', 'string'],
            'modality' => ['required', 'string', 'in:presential,virtual,mixed'],
            'scheduled_date' => ['required', 'date'],
            'completion_date' => ['nullable', 'date', 'after_or_equal:scheduled_date'],
            'duration_hours' => ['nullable', 'integer', 'min:1'],
            'location' => ['nullable', 'string', 'max:255'],
            'instructor' => ['nullable', 'string', 'max:255'],
            'mandatory' => ['boolean'],
            'status' => ['required', 'string', 'in:scheduled,completed,cancelled'],
            'passing_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
        ]);

        $data['max_attempts'] = $data['max_attempts'] ?? 1;

        $training = Training::query()->create($data);

        return response()->json([
            'message' => 'Capacitacion creada correctamente.',
            'training' => $training->load('category'),
        ], 201);
    }

    public function show(Training $training): JsonResponse
    {
        $relations = ['category', 'questions.options', 'materials', 'users', 'participants'];

        if (Schema::hasTable('training_audio_indexations')) {
            $relations[] = 'audioIndexation';
        }

        $training->load($relations);

        return response()->json($training);
    }

    public function update(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'training_category_id' => ['required', 'integer', 'exists:training_categories,id'],
            'description' => ['nullable', 'string'],
            'modality' => ['required', 'string', 'in:presential,virtual,mixed'],
            'scheduled_date' => ['required', 'date'],
            'completion_date' => ['nullable', 'date', 'after_or_equal:scheduled_date'],
            'duration_hours' => ['nullable', 'integer', 'min:1'],
            'location' => ['nullable', 'string', 'max:255'],
            'instructor' => ['nullable', 'string', 'max:255'],
            'mandatory' => ['boolean'],
            'status' => ['required', 'string', 'in:scheduled,completed,cancelled'],
            'passing_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
        ]);

        $data['max_attempts'] = $data['max_attempts'] ?? 1;

        $training->update($data);

        $relations = ['category', 'questions.options', 'materials'];

        if (Schema::hasTable('training_audio_indexations')) {
            $relations[] = 'audioIndexation';
        }

        return response()->json([
            'message' => 'Capacitacion actualizada correctamente.',
            'training' => $training->fresh()->load($relations),
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

    public function participants(Training $training): JsonResponse
    {
        $participants = $training->participants()
            ->with('empresa:id,name,active')
            ->orderBy('full_name')
            ->get();

        foreach ($participants as $participant) {
            $score = $this->resolveParticipantScore($training, $participant);
            $completedAt = $this->resolveParticipantCompletedAt($participant);
            $hasAnswers = $this->participantHasAnswers($participant);

            if ($score !== null) {
                $participant->setAttribute('score', $score);
            }

            if ($completedAt !== null) {
                $participant->setAttribute('completed_at', $completedAt);
            }

            $participant->setAttribute('attended', $hasAnswers);
            $participant->setAttribute('passed', $score !== null ? $score >= $training->passing_score : null);
        }

        return response()->json($participants);
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

    private function participantHasAnswers(TrainingParticipant $participant): bool
    {
        return DB::table('participant_answers')
            ->where('training_participant_id', $participant->id)
            ->exists();
    }

    public function downloadParticipantsReport(Training $training)
    {
        $training->loadMissing('category');
        if (! $training->category?->empresa_id) {
            return response()->json(['message' => 'El programa de esta capacitacion no tiene empresa asociada.'], 422);
        }

        $filename = 'plantilla-participantes-' . Str::slug($training->title) . '.xlsx';

        return Excel::download(new TrainingParticipantsExport($training), $filename);
    }

    public function downloadTrainingParticipantsReport(Training $training)
    {
        $training->loadMissing('category');
        if (! $training->category?->empresa_id) {
            return response()->json(['message' => 'El programa de esta capacitacion no tiene empresa asociada.'], 422);
        }

        $filename = 'reporte-participantes-' . Str::slug($training->title) . '.xlsx';

        return Excel::download(new TrainingParticipantsDetailedExport($training), $filename);
    }

    public function importParticipantsReport(Request $request, Training $training): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        $training->loadMissing('category');
        if (! $training->category?->empresa_id) {
            return response()->json(['message' => 'El programa de esta capacitacion no tiene empresa asociada.'], 422);
        }

        $import = new TrainingParticipantsImport($training);
        Excel::import($import, $request->file('file'));

        $summary = $import->summary();

        return response()->json([
            'message' => 'Carga masiva procesada correctamente.',
            'created' => $summary['created'],
            'updated' => $summary['updated'],
            'skipped' => $summary['skipped'],
            'errors' => $summary['errors'],
        ]);
    }

    public function storeParticipant(Request $request, Training $training): JsonResponse
    {
        $training->loadMissing('category');
        $empresaId = $training->category?->empresa_id;
        if (! $empresaId) {
            return response()->json(['message' => 'El programa de esta capacitacion no tiene empresa asociada.'], 422);
        }

        $data = $request->validate([
            'document_number' => [
                'required',
                'string',
                'max:20',
                Rule::unique('training_participants', 'document_number')->where(function ($query) use ($training): void {
                    $query->where('training_id', $training->id);
                }),
            ],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $data['empresa_id'] = $empresaId;
        $data['active'] = true;
        $participant = $training->participants()->create($data);

        return response()->json([
            'message' => 'Participante registrado correctamente.',
            'participant' => $participant->load('empresa:id,name,active'),
        ], 201);
    }

    public function updateParticipant(Request $request, Training $training, TrainingParticipant $participant): JsonResponse
    {
        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        $training->loadMissing('category');
        $empresaId = $training->category?->empresa_id;
        if (! $empresaId) {
            return response()->json(['message' => 'El programa de esta capacitacion no tiene empresa asociada.'], 422);
        }

        $data = $request->validate([
            'document_number' => [
                'required',
                'string',
                'max:20',
                Rule::unique('training_participants', 'document_number')
                    ->where(function ($query) use ($training): void {
                        $query->where('training_id', $training->id);
                    })
                    ->ignore($participant->id),
            ],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $data['empresa_id'] = $empresaId;
        $participant->update($data);

        return response()->json([
            'message' => 'Participante actualizado correctamente.',
            'participant' => $participant->fresh()->load('empresa:id,name,active'),
        ]);
    }

    public function activateParticipant(Training $training, TrainingParticipant $participant): JsonResponse
    {
        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        DB::transaction(function () use ($participant): void {
            DB::table('participant_answers')
                ->where('training_participant_id', $participant->id)
                ->delete();

            $participant->update([
                'active' => true,
            ]);
        });

        return response()->json([
            'message' => 'Participante activado correctamente.',
            'participant' => $participant->fresh()->load('empresa:id,name,active'),
        ]);
    }

    public function deactivateParticipant(Training $training, TrainingParticipant $participant): JsonResponse
    {
        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        $participant->update(['active' => false]);

        return response()->json([
            'message' => 'Participante desactivado correctamente.',
            'participant' => $participant->fresh()->load('empresa:id,name,active'),
        ]);
    }

    public function destroyParticipant(Training $training, TrainingParticipant $participant): JsonResponse
    {
        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        $participant->delete();

        return response()->json([
            'message' => 'Participante eliminado correctamente.',
        ]);
    }

    public function participantReview(Training $training, TrainingParticipant $participant): JsonResponse
    {
        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        $questions = $training->questions()
            ->with(['options' => function ($query): void {
                $query->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        $answers = DB::table('participant_answers as pa')
            ->leftJoin('question_options as qo', 'pa.selected_option_id', '=', 'qo.id')
            ->where('pa.training_participant_id', $participant->id)
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
            $expectedAnswers = $question->options
                ->where('is_correct', true)
                ->pluck('option_text')
                ->filter()
                ->values();

            return [
                'id' => $question->id,
                'question_text' => $question->question_text,
                'type' => $question->type,
                'order' => $question->order,
                'expected_answer_text' => $question->type === 'open'
                    ? 'Revisión manual'
                    : ($expectedAnswers->isNotEmpty() ? $expectedAnswers->implode(', ') : 'Sin respuesta correcta configurada'),
                'participant_answer_text' => $answer ? (
                    $answer->answer_text ?? $answer->selected_option_text ?? 'Sin respuesta registrada'
                ) : null,
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

        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        $questions = $training->questions()
            ->where('type', 'open')
            ->get()
            ->keyBy('id');
        $manualQuestionIds = [];
        $existingAnswers = DB::table('participant_answers')
            ->where('training_participant_id', $participant->id)
            ->get()
            ->keyBy('question_id');

        DB::transaction(function () use ($data, $questions, $participant, $training, &$manualQuestionIds, $existingAnswers): void {
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
                            'training_participant_id' => $participant->id,
                            'question_id' => $question->id,
                        ],
                        [
                            'score' => $scoreToStore,
                            'updated_at' => now(),
                        ]
                    );
            }

            $answerScores = DB::table('participant_answers')
                ->where('training_participant_id', $participant->id)
                ->whereIn('question_id', $questions->keys())
                ->pluck('score');

            $totalQuestions = $questions->count();
            $finalScore = $answerScores->count() === $totalQuestions && ! $answerScores->contains(fn ($value): bool => $value === null)
                ? round((float) $answerScores->avg(), 2)
                : null;
            $finalPassed = $participant->passed !== null
                ? (bool) $participant->passed
                : ($finalScore !== null ? $finalScore >= $training->passing_score : null);

            $updates = [];

            if (Schema::hasColumn('training_participants', 'attended')) {
                $updates['attended'] = $participant->attended ?? true;
            }

            if (Schema::hasColumn('training_participants', 'score')) {
                $updates['score'] = $finalScore;
            }

            if (Schema::hasColumn('training_participants', 'passed')) {
                $updates['passed'] = $finalPassed;
            }

            if (Schema::hasColumn('training_participants', 'observations')) {
                $updates['observations'] = $data['observations'] ?? null;
            }

            if (Schema::hasColumn('training_participants', 'completed_at')) {
                $updates['completed_at'] = $participant->completed_at ?? now();
            }

            $participant->update($updates);
        });

        return response()->json([
            'message' => 'Revision guardada correctamente.',
            'reviewed_questions' => count($manualQuestionIds),
        ]);
    }

    public function resetParticipantAttempt(Training $training, TrainingParticipant $participant): JsonResponse
    {
        if ($participant->training_id !== $training->id) {
            return response()->json(['message' => 'Participante no pertenece a esta capacitacion.'], 404);
        }

        DB::transaction(function () use ($participant): void {
            DB::table('participant_answers')
                ->where('training_participant_id', $participant->id)
                ->delete();

            $updates = [];

            foreach (['attended', 'score', 'passed', 'observations', 'attendance_date', 'completed_at', 'attempt_started_at'] as $column) {
                if (Schema::hasColumn('training_participants', $column)) {
                    $updates[$column] = null;
                }
            }

            if (Schema::hasColumn('training_participants', 'attempts_count')) {
                $updates['attempts_count'] = 0;
            }

            $participant->update($updates);
        });

        return response()->json([
            'message' => 'Intento del participante reiniciado correctamente.',
        ]);
    }

    public function uploadMaterial(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:102400'], // 100MB max
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
