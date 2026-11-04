<?php

namespace App\Exports;

use App\Models\Training;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class TrainingQuestionsTemplateExport implements WithMultipleSheets
{
    public function __construct(private readonly Training $training)
    {
    }

    public function sheets(): array
    {
        return [
            new TrainingQuestionsSheetExport($this->training),
            new TrainingQuestionTypesSheetExport(),
        ];
    }
}
