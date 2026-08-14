<?php

namespace App\Services;

use App\Models\PowerbiData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;
use Throwable;

class PowerbiWorkbookService
{
    /**
     * @param array{
     *   date_from?: string|null,
     *   date_to?: string|null,
     *   department?: string|null,
     *   municipality?: string|null,
     *   causal?: string|null,
     *   mechanism?: string|null
     * } $filters
     */
    public function dashboard(array $filters = []): array
    {
        $query = $this->filteredDashboardQuery($filters);
        $rows = $query->orderByDesc('fecha_siniestro')->orderByDesc('id')->get();
        $rowCollection = $rows->values();
        $now = now();

        $summary = [
            'total_records' => $rowCollection->count(),
            'current_year_records' => $rowCollection->filter(fn (PowerbiData $row): bool => $row->fecha_siniestro?->year === $now->year)->count(),
            'current_month_records' => $rowCollection->filter(fn (PowerbiData $row): bool => $row->fecha_siniestro?->year === $now->year && $row->fecha_siniestro?->month === $now->month)->count(),
            'departments_count' => $rowCollection->pluck('departamento_ocurrencia_siniestro')->filter()->unique()->count(),
            'municipalities_count' => $rowCollection->pluck('municipio_ocurrencia_siniestro')->filter()->unique()->count(),
            'causals_count' => $rowCollection->pluck('causal_evento_grave')->filter()->unique()->count(),
            'mechanisms_count' => $rowCollection->pluck('mecanismo')->filter()->unique()->count(),
            'diagnoses_count' => $rowCollection->pluck('cie_10_dx_1')->filter()->unique()->count(),
        ];

        $charts = [
            'monthly' => $this->aggregateByMonth($rowCollection),
            'causal' => $this->aggregateBy($rowCollection, 'causal_evento_grave'),
            'department' => $this->aggregateBy($rowCollection, 'departamento_ocurrencia_siniestro'),
            'mechanism' => $this->aggregateBy($rowCollection, 'mecanismo'),
            'diagnosis' => $this->aggregateDiagnoses($rowCollection),
        ];

        $records = $rowCollection
            ->take(100)
            ->map(fn (PowerbiData $row): array => $this->formatDashboardRow($row))
            ->values()
            ->all();

        $availableFilters = $this->buildAvailableFilters();

        return [
            'message' => $rowCollection->isEmpty()
                ? 'No hay datos cargados en Power BI.'
                : 'Dashboard Power BI cargado correctamente.',
            'filters' => [
                'date_from' => $filters['date_from'] ?? null,
                'date_to' => $filters['date_to'] ?? null,
                'department' => $filters['department'] ?? null,
                'municipality' => $filters['municipality'] ?? null,
                'causal' => $filters['causal'] ?? null,
                'mechanism' => $filters['mechanism'] ?? null,
            ],
            'summary' => $summary,
            'charts' => $charts,
            'available_filters' => $availableFilters,
            'records' => $records,
            'last_import' => $this->lastImportSummary(),
        ];
    }

    public function previewFile(string $path): array
    {
        $spreadsheet = $this->loadSpreadsheet($path);

        return $this->buildPreview($spreadsheet);
    }

    public function previewUploadedFile(UploadedFile $file): array
    {
        return $this->previewFile($file->getRealPath() ?: $file->getPathname());
    }

    public function importFile(string $path, string $sourceFile): int
    {
        $preview = $this->previewFile($path);

        if ($preview['sheets'] === []) {
            throw new RuntimeException('El archivo no contiene hojas con datos utilizables.');
        }

        DB::transaction(function () use ($preview, $sourceFile): void {
            PowerbiData::query()->delete();

            foreach ($preview['sheets'] as $sheet) {
                foreach ($sheet['rows'] as $index => $row) {
                    PowerbiData::query()->create($this->mapRowToRecord($sheet, $row, $index + 2, $sourceFile));
                }
            }
        });

        return collect($preview['sheets'])->sum(fn (array $sheet): int => count($sheet['rows']));
    }

    public function importUploadedFile(UploadedFile $file): int
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        return $this->importFile($path, $file->getClientOriginalName());
    }

    /**
     * @param array{
     *   date_from?: string|null,
     *   date_to?: string|null,
     *   department?: string|null,
     *   municipality?: string|null,
     *   causal?: string|null,
     *   mechanism?: string|null
     * } $filters
     */
    private function filteredDashboardQuery(array $filters): \Illuminate\Database\Eloquent\Builder
    {
        $query = PowerbiData::query();

        if (! empty($filters['date_from'])) {
            $query->whereDate('fecha_siniestro', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('fecha_siniestro', '<=', $filters['date_to']);
        }

        if (! empty($filters['department'])) {
            $query->where('departamento_ocurrencia_siniestro', $filters['department']);
        }

        if (! empty($filters['municipality'])) {
            $query->where('municipio_ocurrencia_siniestro', $filters['municipality']);
        }

        if (! empty($filters['causal'])) {
            $query->where('causal_evento_grave', $filters['causal']);
        }

        if (! empty($filters['mechanism'])) {
            $query->where('mecanismo', $filters['mechanism']);
        }

        return $query;
    }

    private function loadSpreadsheet(string $path)
    {
        if (! is_file($path)) {
            throw new RuntimeException('No fue posible leer el archivo enviado.');
        }

        try {
            return IOFactory::load($path);
        } catch (Throwable $throwable) {
            throw new RuntimeException('No fue posible procesar el archivo Excel.', 0, $throwable);
        }
    }

    private function buildPreview($spreadsheet): array
    {
        $sheets = [];

        foreach ($spreadsheet->getWorksheetIterator() as $index => $sheet) {
            $sheetRows = $this->cleanRows($sheet->toArray(null, true, true, false));

            if (count($sheetRows) < 2) {
                continue;
            }

            $rawHeaders = array_shift($sheetRows);
            $columns = $this->buildColumns($rawHeaders);
            $rows = $this->buildRows($columns, $sheetRows);

            if ($rows === []) {
                continue;
            }

            $classification = $this->classifyColumns($columns, $rows);

            $sheets[] = [
                'index' => $index,
                'name' => $sheet->getTitle(),
                'row_count' => count($rows),
                'headers' => $columns,
                'rows' => $rows,
                'preview_rows' => array_slice($rows, 0, 20),
                'numeric_columns' => $classification['numeric_columns'],
                'text_columns' => $classification['text_columns'],
            ];
        }

        return [
            'message' => 'Archivo Excel procesado correctamente.',
            'default_sheet_index' => 0,
            'sheets' => $sheets,
        ];
    }

    /**
     * @param \Illuminate\Support\Collection<int, PowerbiData> $rows
     * @return array<int, array{label: string, value: int}>
     */
    private function aggregateByMonth($rows): array
    {
        return $rows
            ->filter(fn (PowerbiData $row): bool => $row->fecha_siniestro !== null)
            ->groupBy(fn (PowerbiData $row): string => $row->fecha_siniestro->format('Y-m'))
            ->map(fn ($group, string $label): array => [
                'label' => $label,
                'value' => $group->count(),
            ])
            ->sortKeys()
            ->values()
            ->all();
    }

    /**
     * @param \Illuminate\Support\Collection<int, PowerbiData> $rows
     * @param string $field
     * @return array<int, array{label: string, value: int}>
     */
    private function aggregateBy($rows, string $field): array
    {
        return $rows
            ->pluck($field)
            ->filter()
            ->groupBy(fn (mixed $value): string => (string) $value)
            ->map(fn ($group, string $label): array => [
                'label' => $label,
                'value' => $group->count(),
            ])
            ->sortByDesc('value')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * @param \Illuminate\Support\Collection<int, PowerbiData> $rows
     * @return array<int, array{label: string, value: int}>
     */
    private function aggregateDiagnoses($rows): array
    {
        return $rows
            ->map(fn (PowerbiData $row): string => trim((string) ($row->cie_10_dx_1 ?: $row->nombre_dx_1)))
            ->filter()
            ->groupBy(fn (string $label): string => $label)
            ->map(fn ($group, string $label): array => [
                'label' => $label,
                'value' => $group->count(),
            ])
            ->sortByDesc('value')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function uniqueValues(string $field): array
    {
        return PowerbiData::query()
            ->whereNotNull($field)
            ->distinct()
            ->orderBy($field)
            ->pluck($field)
            ->filter()
            ->values()
            ->all();
    }

    private function buildAvailableFilters(): array
    {
        return [
            'departments' => $this->uniqueValues('departamento_ocurrencia_siniestro'),
            'municipalities' => $this->uniqueValues('municipio_ocurrencia_siniestro'),
            'causals' => $this->uniqueValues('causal_evento_grave'),
            'mechanisms' => $this->uniqueValues('mecanismo'),
        ];
    }

    private function formatDashboardRow(PowerbiData $row): array
    {
        return [
            'id' => $row->id,
            'source_file' => $row->source_file,
            'sheet_name' => $row->sheet_name,
            'source_row_number' => $row->source_row_number,
            'numero_siniestro' => $row->numero_siniestro,
            'no_identificacion' => $row->no_identificacion,
            'nit' => $row->nit,
            'fecha_siniestro' => $row->fecha_siniestro?->toIso8601String(),
            'causal_evento_grave' => $row->causal_evento_grave,
            'municipio_ocurrencia_siniestro' => $row->municipio_ocurrencia_siniestro,
            'departamento_ocurrencia_siniestro' => $row->departamento_ocurrencia_siniestro,
            'cie_10_dx_1' => $row->cie_10_dx_1,
            'nombre_dx_1' => $row->nombre_dx_1,
            'detalle' => $row->detalle,
            'mecanismo' => $row->mecanismo,
        ];
    }

    private function lastImportSummary(): array
    {
        $lastSource = PowerbiData::query()->latest('id')->value('source_file');

        return [
            'source_file' => $lastSource,
            'rows' => PowerbiData::query()->count(),
        ];
    }

    /**
     * @param array<int, array<int, mixed>> $rows
     * @return array<int, array<int, mixed>>
     */
    private function cleanRows(array $rows): array
    {
        return array_values(array_filter($rows, function (array $row): bool {
            foreach ($row as $value) {
                if ($this->normalizeValue($value) !== null) {
                    return true;
                }
            }

            return false;
        }));
    }

    /**
     * @param array<int, mixed> $headers
     * @return array<int, array{key: string, label: string}>
     */
    private function buildColumns(array $headers): array
    {
        $columns = [];
        $usedLabels = [];

        foreach (array_values($headers) as $index => $header) {
            $baseLabel = trim((string) $header);
            if ($baseLabel === '') {
                $baseLabel = 'Columna '.($index + 1);
            }

            $label = $baseLabel;
            $suffix = 2;

            while (in_array($label, $usedLabels, true)) {
                $label = $baseLabel.' '.$suffix;
                $suffix++;
            }

            $usedLabels[] = $label;

            $columns[] = [
                'key' => 'column_'.($index + 1),
                'label' => $label,
            ];
        }

        return $columns;
    }

    /**
     * @param array<int, array{key: string, label: string}> $columns
     * @param array<int, array<int, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function buildRows(array $columns, array $rows): array
    {
        $normalizedRows = [];

        foreach ($rows as $row) {
            $normalizedRow = [];

            foreach ($columns as $index => $column) {
                $normalizedRow[$column['key']] = $this->normalizeValue($row[$index] ?? null);
            }

            $hasContent = false;
            foreach ($normalizedRow as $value) {
                if ($value !== null && $value !== '') {
                    $hasContent = true;
                    break;
                }
            }

            if ($hasContent) {
                $normalizedRows[] = $normalizedRow;
            }
        }

        return $normalizedRows;
    }

    /**
     * @param array<int, array{key: string, label: string}> $columns
     * @param array<int, array<string, mixed>> $rows
     * @return array{numeric_columns: array<int, string>, text_columns: array<int, string>}
     */
    private function classifyColumns(array $columns, array $rows): array
    {
        $numericColumns = [];
        $textColumns = [];

        foreach ($columns as $column) {
            $nonEmptyCount = 0;
            $numericCount = 0;

            foreach ($rows as $row) {
                $value = $row[$column['key']] ?? null;

                if ($value === null || $value === '') {
                    continue;
                }

                $nonEmptyCount++;

                if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
                    $numericCount++;
                }
            }

            if ($nonEmptyCount > 0 && $numericCount === $nonEmptyCount) {
                $numericColumns[] = $column['key'];
                continue;
            }

            $textColumns[] = $column['key'];
        }

        return [
            'numeric_columns' => $numericColumns,
            'text_columns' => $textColumns,
        ];
    }

    private function mapRowToRecord(array $sheet, array $row, int $sourceRowNumber, string $sourceFile): array
    {
        $record = [
            'source_file' => $sourceFile,
            'sheet_name' => $sheet['name'],
            'source_row_number' => $sourceRowNumber,
            'raw_data' => $row,
        ];

        foreach ($sheet['headers'] as $column) {
            $label = mb_strtoupper(trim((string) $column['label']));
            $value = $row[$column['key']] ?? null;

            match ($label) {
                'NUMERO_SINIESTRO' => $record['numero_siniestro'] = $this->normalizeString($value),
                'NO_IDENTIFICACION' => $record['no_identificacion'] = $this->normalizeString($value),
                'NIT' => $record['nit'] = $this->normalizeString($value),
                'FECHA_SINIESTRO' => $record['fecha_siniestro'] = $this->normalizeDateTime($value),
                'CAUSAL_EVENTO_GRAVE' => $record['causal_evento_grave'] = $this->normalizeString($value),
                'MUNICIPIO_OCURRENCIA_SINIESTRO' => $record['municipio_ocurrencia_siniestro'] = $this->normalizeString($value),
                'DEPARTAMENTO_OCURRENCIA_SINIESTRO' => $record['departamento_ocurrencia_siniestro'] = $this->normalizeString($value),
                'CIE_10_DX_1' => $record['cie_10_dx_1'] = $this->normalizeString($value),
                'NOMBRE_DX_1' => $record['nombre_dx_1'] = $this->normalizeString($value),
                'DETALLE' => $record['detalle'] = $this->normalizeString($value),
                'MECANISMO' => $record['mecanismo'] = $this->normalizeString($value),
                default => null,
            };
        }

        return Arr::only($record, [
            'source_file',
            'sheet_name',
            'source_row_number',
            'numero_siniestro',
            'no_identificacion',
            'nit',
            'fecha_siniestro',
            'causal_evento_grave',
            'municipio_ocurrencia_siniestro',
            'departamento_ocurrencia_siniestro',
            'cie_10_dx_1',
            'nombre_dx_1',
            'detalle',
            'mecanismo',
            'raw_data',
        ]);
    }

    private function normalizeString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $stringValue = trim((string) $value);

        return $stringValue === '' ? null : $stringValue;
    }

    private function normalizeDateTime(mixed $value): ?string
    {
        $stringValue = $this->normalizeString($value);

        if ($stringValue === null) {
            return null;
        }

        try {
            return Carbon::parse($stringValue)->toDateTimeString();
        } catch (Throwable) {
            return $stringValue;
        }
    }

    private function normalizeValue(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = trim($value);

            return $value === '' ? null : $value;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return $value;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        if (is_object($value) && method_exists($value, '__toString')) {
            $stringValue = trim((string) $value);

            return $stringValue === '' ? null : $stringValue;
        }

        return $value;
    }
}
