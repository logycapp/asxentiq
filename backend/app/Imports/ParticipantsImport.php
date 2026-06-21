<?php

namespace App\Imports;

use App\Models\TrainingParticipant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ParticipantsImport implements ToCollection, WithHeadingRow
{
    private int $created = 0;

    private int $updated = 0;

    /**
     * @var array<int, array{row:int, errors:array<int, string>}>
     */
    private array $errors = [];

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;

            $data = [
                'document_number' => trim((string) ($row['cedula'] ?? $row['document_number'] ?? '')),
                'full_name' => trim((string) ($row['nombre'] ?? $row['full_name'] ?? '')),
                'email' => $this->nullableValue($row['email'] ?? null),
                'phone' => $this->nullableValue($row['telefono'] ?? $row['phone'] ?? null),
            ];

            $validator = Validator::make($data, [
                'document_number' => ['required', 'string', 'max:20'],
                'full_name' => ['required', 'string', 'max:255'],
                'email' => ['nullable', 'string', 'email', 'max:255'],
                'phone' => ['nullable', 'string', 'max:20'],
            ]);

            if ($validator->fails()) {
                $this->errors[] = [
                    'row' => $rowNumber,
                    'errors' => $validator->errors()->all(),
                ];

                continue;
            }

            $participant = TrainingParticipant::query()->updateOrCreate(
                ['document_number' => $data['document_number']],
                $data
            );

            if ($participant->wasRecentlyCreated) {
                $this->created++;
            } else {
                $this->updated++;
            }
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

    private function nullableValue(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
