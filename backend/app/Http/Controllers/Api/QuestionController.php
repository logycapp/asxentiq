<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Training;
use App\Models\TrainingMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class QuestionController extends Controller
{
    public function index(Training $training): JsonResponse
    {
        $questions = $training->questions()->with('options', 'materials')->orderBy('order')->get();

        return response()->json($questions);
    }

    public function store(Request $request, Training $training): JsonResponse
    {
        $data = $request->validate([
            'question_text' => ['required', 'string'],
            'type' => ['required', 'string', 'in:open,multiple_choice,yes_no'],
            'order' => ['nullable', 'integer', 'min:0'],
            'options' => ['nullable', 'array'],
            'options.*.option_text' => ['nullable', 'string', 'max:255'],
            'options.*.is_correct' => ['nullable', 'boolean'],
            'options.*.order' => ['nullable', 'integer', 'min:0'],
        ]);

        $question = DB::transaction(function () use ($training, $data): Question {
            $question = $training->questions()->create([
                'question_text' => $data['question_text'],
                'type' => $data['type'],
                'order' => $data['order'] ?? 0,
            ]);

            $this->syncOptions($question, $data['options'] ?? []);

            return $question->load('options', 'materials');
        });

        return response()->json([
            'message' => 'Pregunta creada correctamente.',
            'question' => $question,
        ], 201);
    }

    public function show(Question $question): JsonResponse
    {
        $question->load('options', 'materials', 'training');

        return response()->json($question);
    }

    public function update(Request $request, Question $question): JsonResponse
    {
        $data = $request->validate([
            'question_text' => ['required', 'string'],
            'type' => ['required', 'string', 'in:open,multiple_choice,yes_no'],
            'order' => ['nullable', 'integer', 'min:0'],
            'options' => ['nullable', 'array'],
            'options.*.option_text' => ['nullable', 'string', 'max:255'],
            'options.*.is_correct' => ['nullable', 'boolean'],
            'options.*.order' => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($question, $data): void {
            $question->update([
                'question_text' => $data['question_text'],
                'type' => $data['type'],
                'order' => $data['order'] ?? 0,
            ]);

            $this->syncOptions($question, $data['options'] ?? []);
        });

        return response()->json([
            'message' => 'Pregunta actualizada correctamente.',
            'question' => $question->fresh()->load('options', 'materials'),
        ]);
    }

    public function destroy(Question $question): JsonResponse
    {
        foreach ($question->materials as $material) {
            Storage::disk('public')->delete($material->filepath);
            $material->delete();
        }

        $question->delete();

        return response()->json([
            'message' => 'Pregunta eliminada correctamente.',
        ]);
    }

    public function storeOption(Request $request, Question $question): JsonResponse
    {
        if ($question->type === 'yes_no') {
            return response()->json(['message' => 'Las preguntas Si/No no tienen opciones manuales.'], 422);
        }

        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:255'],
            'is_correct' => ['boolean'],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        $option = $question->options()->create($data);

        return response()->json([
            'message' => 'Opcion creada correctamente.',
            'option' => $option,
        ], 201);
    }

    public function updateOption(Request $request, QuestionOption $option): JsonResponse
    {
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:255'],
            'is_correct' => ['boolean'],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        $option->update($data);

        return response()->json([
            'message' => 'Opcion actualizada correctamente.',
            'option' => $option->fresh(),
        ]);
    }

    public function destroyOption(QuestionOption $option): JsonResponse
    {
        $option->delete();

        return response()->json([
            'message' => 'Opcion eliminada correctamente.',
        ]);
    }

    /**
     * @param array<int, array<string, mixed>> $options
     */
    private function syncOptions(Question $question, array $options): void
    {
        $question->options()->delete();

        if ($question->type === 'open') {
            return;
        }

        foreach (array_values($options) as $index => $optionData) {
            $optionText = trim((string) ($optionData['option_text'] ?? ''));

            if ($optionText === '') {
                continue;
            }

            $question->options()->create([
                'option_text' => $optionText,
                'is_correct' => (bool) ($optionData['is_correct'] ?? false),
                'order' => (int) ($optionData['order'] ?? $index),
            ]);
        }
    }

    public function uploadMaterial(Request $request, Question $question): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:102400'],
            'type' => ['required', 'string', 'in:video,pdf,spreadsheet,other'],
        ]);

        $file = $request->file('file');
        $filename = $file->getClientOriginalName();
        $filepath = $file->store('questions/' . $question->id, 'public');

        $material = $question->materials()->create([
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

    public function deleteMaterial(Question $question, TrainingMaterial $material): JsonResponse
    {
        if ($material->trainable_type !== Question::class || $material->trainable_id !== $question->id) {
            return response()->json(['message' => 'Material no pertenece a esta pregunta.'], 403);
        }

        Storage::disk('public')->delete($material->filepath);
        $material->delete();

        return response()->json([
            'message' => 'Material eliminado correctamente.',
        ]);
    }
}
