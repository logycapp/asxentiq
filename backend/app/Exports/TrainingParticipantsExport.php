<?php

namespace App\Exports;

use App\Models\Training;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TrainingParticipantsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private readonly Training $training)
    {
    }

    public function collection(): Collection
    {
        return $this->training->participants()
            ->with('empresa:id,name')
            ->orderBy('full_name')
            ->get();
    }

    public function headings(): array
    {
        return [
            'Cedula',
            'Nombre',
            'Email',
            'Telefono',
        ];
    }

    public function map($participant): array
    {
        return [
            $participant->document_number,
            $participant->full_name,
            $participant->email,
            $participant->phone,
        ];
    }
}
