<?php

namespace App\Exports;

use App\Models\Training;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;

class TrainingQuestionsSheetExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithTitle
{
    public function __construct(private readonly Training $training)
    {
    }

    public function title(): string
    {
        return 'Preguntas';
    }

    public function collection(): Collection
    {
        return $this->training->questions()
            ->with('options')
            ->orderBy('order')
            ->get()
            ->map(function ($question): array {
                $options = $question->options->sortBy('order')->values();

                return [
                    'order' => $question->order,
                    'question_text' => $question->question_text,
                    'type' => $question->type,
                    'option_1' => $options->get(0)?->option_text,
                    'option_2' => $options->get(1)?->option_text,
                    'option_3' => $options->get(2)?->option_text,
                    'option_4' => $options->get(3)?->option_text,
                    'correct_answer' => $options->firstWhere('is_correct', true)?->option_text ?? null,
                ];
            });
    }

    public function headings(): array
    {
        return [
            'Orden',
            'Pregunta',
            'Tipo',
            'Opcion 1',
            'Opcion 2',
            'Opcion 3',
            'Opcion 4',
            'Respuesta correcta',
        ];
    }

    public function map($row): array
    {
        return [
            $row['order'] ?? null,
            $row['question_text'] ?? null,
            $row['type'] ?? null,
            $row['option_1'] ?? null,
            $row['option_2'] ?? null,
            $row['option_3'] ?? null,
            $row['option_4'] ?? null,
            $row['correct_answer'] ?? null,
        ];
    }
}
