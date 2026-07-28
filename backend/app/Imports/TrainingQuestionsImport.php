<?php

namespace App\Imports;

use App\Models\Question;
use App\Models\Training;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class TrainingQuestionsImport implements ToCollection, WithHeadingRow
{
    private int $created = 0;

    private int $updated = 0;

    /**
     * @var array<int, array{row:int, errors:array<int, string>}>
     */
    private array $errors = [];

    /**
     * @var array<int, true>
     */
    private array $seenOrders = [];

    public function __construct(private readonly Training $training)
    {
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $order = $this->resolveOrder($row, $rowNumber);
            $questionText = trim((string) $this->firstValue($row, ['question_text', 'pregunta']));
            $type = $this->normalizeType($this->firstValue($row, ['type', 'tipo']));
            $correctAnswer = trim((string) $this->firstValue($row, ['correct_answer', 'respuesta_correcta', 'respuesta']));
            $optionTexts = $this->collectOptions($row);

            $validator = Validator::make([
                'order' => $order,
                'question_text' => $questionText,
                'type' => $type,
                'correct_answer' => $correctAnswer,
            ], [
                'order' => ['required', 'integer', 'min:0'],
                'question_text' => ['required', 'string'],
                'type' => ['required', 'in:multiple_choice,yes_no'],
                'correct_answer' => ['required', 'string'],
            ]);

            $errors = $validator->errors()->all();

            if (isset($this->seenOrders[$order])) {
                $errors[] = 'El orden ' . $order . ' esta repetido en el archivo.';
            }

            if ($type === 'multiple_choice') {
                $optionTexts = array_values(array_filter($optionTexts, static fn (string $value): bool => $value !== ''));

                if (count($optionTexts) < 2) {
                    $errors[] = 'Las preguntas de opcion multiple requieren al menos 2 opciones.';
                }

                if ($correctAnswer === '') {
                    $errors[] = 'Debes indicar la respuesta correcta.';
                } elseif (! $this->optionExists($optionTexts, $correctAnswer)) {
                    $errors[] = 'La respuesta correcta debe coincidir con una de las opciones.';
                }
            } elseif ($type === 'yes_no') {
                if (! $this->isYesNoAnswer($correctAnswer)) {
                    $errors[] = 'En preguntas Si/No la respuesta correcta debe ser "Si" o "No".';
                }
            }

            if ($errors !== []) {
                $this->errors[] = [
                    'row' => $rowNumber,
                    'errors' => $errors,
                ];

                continue;
            }

            DB::transaction(function () use ($order, $questionText, $type, $correctAnswer, $optionTexts): void {
                $question = Question::query()->updateOrCreate(
                    [
                        'training_id' => $this->training->id,
                        'order' => $order,
                    ],
                    [
                        'question_text' => $questionText,
                        'type' => $type,
                    ]
                );

                $question->options()->delete();

                if ($type === 'multiple_choice') {
                    foreach (array_values($optionTexts) as $index => $optionText) {
                        $question->options()->create([
                            'option_text' => $optionText,
                            'is_correct' => $this->normalizeText($optionText) === $this->normalizeText($correctAnswer),
                            'order' => $index,
                        ]);
                    }
                } elseif ($type === 'yes_no') {
                    $question->options()->createMany([
                        [
                            'option_text' => 'Si',
                            'is_correct' => $this->isYesNoAnswer($correctAnswer) && $this->normalizeText($correctAnswer) === 'si',
                            'order' => 0,
                        ],
                        [
                            'option_text' => 'No',
                            'is_correct' => $this->isYesNoAnswer($correctAnswer) && $this->normalizeText($correctAnswer) === 'no',
                            'order' => 1,
                        ],
                    ]);
                }

                if ($question->wasRecentlyCreated) {
                    $this->created++;
                } else {
                    $this->updated++;
                }
            });

            $this->seenOrders[$order] = true;
        }
    }

    public function summary(): array
    {
        return [
            'created' => $this->created,
            'updated' => $this->updated,
            'skipped' => count($this->errors),
            'errors' => $this->errors,
        ];
    }

    private function resolveOrder(mixed $row, int $fallback): int
    {
        $raw = $this->firstValue($row, ['order', 'orden']);
        $value = trim((string) $raw);

        if ($value === '') {
            return $fallback;
        }

        return max((int) $value, 0);
    }

    private function firstValue(mixed $row, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (is_array($row) && array_key_exists($key, $row) && trim((string) $row[$key]) !== '') {
                return $row[$key];
            }

            if ($row instanceof Collection && $row->has($key) && trim((string) $row->get($key)) !== '') {
                return $row->get($key);
            }
        }

        return null;
    }

    private function normalizeType(mixed $value): ?string
    {
        $normalized = $this->normalizeText((string) $value);

        return match ($normalized) {
            'multiple_choice', 'multiple', 'opcion_multiple', 'opcionmultiple', 'multiple choice' => 'multiple_choice',
            'yes_no', 'si_no', 'si/no', 'si o no', 'sino', 'si no' => 'yes_no',
            default => null,
        };
    }

    /**
     * @return array<int, string>
     */
    private function collectOptions(mixed $row): array
    {
        $options = [];

        foreach (['option_1', 'option_2', 'option_3', 'option_4', 'opcion_1', 'opcion_2', 'opcion_3', 'opcion_4'] as $key) {
            $value = $this->firstValue($row, [$key]);
            $text = trim((string) $value);

            if ($text !== '') {
                $options[] = $text;
            }
        }

        return $options;
    }

    private function normalizeText(string $value): string
    {
        return Str::ascii(trim(mb_strtolower($value)));
    }

    private function optionExists(array $options, string $answer): bool
    {
        $answerNormalized = $this->normalizeText($answer);

        foreach ($options as $option) {
            if ($this->normalizeText($option) === $answerNormalized) {
                return true;
            }
        }

        return false;
    }

    private function isYesNoAnswer(string $answer): bool
    {
        return in_array($this->normalizeText($answer), ['si', 'no'], true);
    }
}
