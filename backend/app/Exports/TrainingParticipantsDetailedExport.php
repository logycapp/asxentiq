<?php

namespace App\Exports;

use App\Models\Training;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TrainingParticipantsDetailedExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
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
            'Empresa',
            'Presento',
            'Puntaje',
            'Resultado',
            'Completado el',
            'Observaciones',
        ];
    }

    public function map($participant): array
    {
        $presented = $participant->completed_at
            ? ($participant->attended ? 'Si' : 'No')
            : 'Pendiente';

        $result = $participant->score === null
            ? 'Pendiente de revision'
            : ($participant->score >= ($this->training->passing_score ?? 70) ? 'Aprobado' : 'No Aprobado');

        return [
            $participant->document_number,
            $participant->full_name,
            $participant->email,
            $participant->phone,
            $participant->empresa?->name ?? 'Sin empresa',
            $presented,
            $participant->score !== null ? $participant->score . '%' : '-',
            $result,
            optional($participant->completed_at)->format('d/m/Y H:i') ?? '-',
            $participant->observations ?: '-',
        ];
    }
}
