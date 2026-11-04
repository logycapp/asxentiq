<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class TrainingQuestionTypesSheetExport implements FromCollection, WithHeadings, ShouldAutoSize, WithTitle
{
    public function title(): string
    {
        return 'Tipos';
    }

    public function collection(): Collection
    {
        return collect([
            [
                'type' => 'multiple_choice',
                'description' => 'Pregunta de opcion multiple con varias respuestas posibles y una respuesta correcta.',
                'example' => 'Usa Opcion 1 a Opcion 4 y marca en Respuesta correcta la opcion valida.',
            ],
            [
                'type' => 'yes_no',
                'description' => 'Pregunta de respuesta cerrada con opciones Si y No.',
                'example' => 'Completa la columna Respuesta correcta con Si o No.',
            ],
        ]);
    }

    public function headings(): array
    {
        return [
            'Tipo',
            'Descripcion',
            'Como completar',
        ];
    }
}
