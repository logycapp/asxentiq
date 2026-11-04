<?php

namespace App\Exports;

use App\Models\TrainingParticipant;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ParticipantsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function collection(): Collection
    {
        return TrainingParticipant::query()->orderBy('full_name')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Cedula',
            'Nombre',
            'Email',
            'Telefono',
            'Creado el',
            'Actualizado el',
        ];
    }

    public function map($participant): array
    {
        return [
            $participant->id,
            $participant->document_number,
            $participant->full_name,
            $participant->email,
            $participant->phone,
            optional($participant->created_at)->format('d/m/Y H:i'),
            optional($participant->updated_at)->format('d/m/Y H:i'),
        ];
    }
}
