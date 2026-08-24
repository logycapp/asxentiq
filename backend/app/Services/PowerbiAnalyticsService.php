<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Throwable;

/**
 * Agregación en PHP sobre filas JSON: dado un dataset (columnas + filas),
 * una configuración de visualización y filtros, calcula puntos agregados,
 * KPIs y opciones de filtro.
 */
class PowerbiAnalyticsService
{
    private const FILTER_DISTINCT_LIMIT = 50;

    /**
     * @param  array<int, array{key: string, label: string, type: string}>  $columns
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array{label_column?: string|null, value_column?: string|null, aggregation?: string, date_grouping?: string|null}  $config
     * @return array<int, array{label: string, value: int|float}>
     */
    public function aggregate(array $columns, array $rows, array $config): array
    {
        $labelColumn = $config['label_column'] ?? null;
        $valueColumn = $config['value_column'] ?? null;
        $aggregation = $config['aggregation'] ?? 'count';
        $dateGrouping = $config['date_grouping'] ?? null;

        if ($labelColumn === null || $labelColumn === '') {
            return [];
        }

        $columnType = $this->columnType($columns, $labelColumn);
        $groups = [];

        foreach ($rows as $row) {
            $rawLabel = $row[$labelColumn] ?? null;

            if ($rawLabel === null || $rawLabel === '') {
                continue;
            }

            $label = $columnType === 'date' && $dateGrouping !== null
                ? $this->dateGroupLabel($rawLabel, $dateGrouping)
                : (string) $rawLabel;

            if ($label === null) {
                continue;
            }

            $groups[$label] ??= [
                'count' => 0,
                'sum' => 0.0,
                'values' => [],
                'min' => null,
                'max' => null,
            ];

            $groups[$label]['count']++;

            $value = $valueColumn !== null ? ($row[$valueColumn] ?? null) : null;

            if ($value !== null && $value !== '' && is_numeric($value)) {
                $numeric = (float) $value;
                $groups[$label]['sum'] += $numeric;
                $groups[$label]['values'][] = $numeric;
                $groups[$label]['min'] = $groups[$label]['min'] === null ? $numeric : min($groups[$label]['min'], $numeric);
                $groups[$label]['max'] = $groups[$label]['max'] === null ? $numeric : max($groups[$label]['max'], $numeric);
            }
        }

        $points = [];

        foreach ($groups as $label => $group) {
            $points[] = [
                'label' => $label,
                'value' => $this->resolve($group, $aggregation),
            ];
        }

        if ($columnType === 'date' && $dateGrouping !== null) {
            usort($points, fn (array $a, array $b): int => strcmp((string) $a['label'], (string) $b['label']));
        } else {
            usort($points, fn (array $a, array $b): int => $b['value'] <=> $a['value']);
        }

        return $points;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array{label_column?: string|null, value_column?: string|null, aggregation?: string, date_grouping?: string|null}  $config
     */
    public function kpi(array $rows, array $config): float
    {
        $aggregation = $config['aggregation'] ?? 'count';
        $valueColumn = $config['value_column'] ?? null;

        if ($aggregation === 'count' && $valueColumn === null) {
            return (float) count($rows);
        }

        $values = [];

        foreach ($rows as $row) {
            $value = $valueColumn !== null ? ($row[$valueColumn] ?? null) : null;

            if ($value === null || $value === '' || ! is_numeric($value)) {
                continue;
            }

            $values[] = (float) $value;
        }

        if ($aggregation === 'count') {
            return (float) count($values);
        }

        if ($values === []) {
            return 0.0;
        }

        return match ($aggregation) {
            'sum' => array_sum($values),
            'avg' => array_sum($values) / count($values),
            'min' => min($values),
            'max' => max($values),
            default => (float) count($rows),
        };
    }

    /**
     * Opciones de filtro derivadas de las columnas del dataset activo:
     * min/max para columnas date y valores distintos para columnas string
     * de baja cardinalidad.
     *
     * @param  array<int, array{key: string, label: string, type: string}>  $columns
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, array{type: string, label: string, values?: array<int, string>, min?: string, max?: string}>
     */
    public function filterOptions(array $columns, array $rows): array
    {
        $options = [];

        foreach ($columns as $column) {
            $key = $column['key'];

            if (($column['type'] ?? 'string') === 'date') {
                $dates = [];

                foreach ($rows as $row) {
                    $date = $this->parseDate($row[$key] ?? null);

                    if ($date !== null) {
                        $dates[] = $date;
                    }
                }

                if ($dates === []) {
                    continue;
                }

                usort($dates, fn (Carbon $a, Carbon $b): int => $a->timestamp <=> $b->timestamp);

                $options[$key] = [
                    'type' => 'date',
                    'label' => $column['label'],
                    'min' => $dates[0]->format('Y-m-d'),
                    'max' => $dates[count($dates) - 1]->format('Y-m-d'),
                ];

                continue;
            }

            if (($column['type'] ?? 'string') !== 'string') {
                continue;
            }

            $distinct = [];

            foreach ($rows as $row) {
                $value = $row[$key] ?? null;

                if ($value === null || $value === '') {
                    continue;
                }

                $distinct[(string) $value] = true;
            }

            if (count($distinct) > self::FILTER_DISTINCT_LIMIT) {
                continue;
            }

            $values = array_keys($distinct);
            sort($values, SORT_STRING);

            $options[$key] = [
                'type' => 'string',
                'label' => $column['label'],
                'values' => $values,
            ];
        }

        return $options;
    }

    /**
     * Aplica filtros sobre las filas: igualdad para columnas string y
     * rango para columnas date (formato `{key: ['from' => ..., 'to' => ...]}`).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, mixed>  $filters
     * @param  array<int, array{key: string, label: string, type: string}>  $columns
     * @return array<int, array<string, mixed>>
     */
    public function applyFilters(array $rows, array $filters, array $columns): array
    {
        if ($filters === []) {
            return $rows;
        }

        $columnsByKey = [];

        foreach ($columns as $column) {
            $columnsByKey[$column['key']] = $column;
        }

        foreach ($filters as $key => $value) {
            if ($value === null || $value === '' || $value === []) {
                continue;
            }

            $column = $columnsByKey[$key] ?? null;

            if ($column === null) {
                continue;
            }

            if (($column['type'] ?? 'string') === 'date' && is_array($value)) {
                $from = isset($value['from']) && $value['from'] !== '' ? (string) $value['from'] : null;
                $to = isset($value['to']) && $value['to'] !== '' ? (string) $value['to'] : null;

                if ($from === null && $to === null) {
                    continue;
                }

                $fromDate = $from !== null ? $this->parseDate($from) : null;
                $toDate = $to !== null ? $this->parseDate($to) : null;

                if ($fromDate === null && $toDate === null) {
                    continue;
                }

                $rows = array_filter($rows, function (array $row) use ($key, $fromDate, $toDate): bool {
                    $date = $this->parseDate($row[$key] ?? null);

                    if ($date === null) {
                        return false;
                    }

                    if ($fromDate !== null && $date->lt($fromDate)) {
                        return false;
                    }

                    if ($toDate !== null && $date->gt($toDate->copy()->endOfDay())) {
                        return false;
                    }

                    return true;
                });

                continue;
            }

            $rows = array_filter($rows, fn (array $row): bool => ($row[$key] ?? null) == $value);
        }

        return array_values($rows);
    }

    /**
     * @param  array{count: int, sum: float, values: array<int, float>, min: float|null, max: float|null}  $group
     */
    private function resolve(array $group, string $aggregation): int|float
    {
        return match ($aggregation) {
            'sum' => $group['sum'],
            'avg' => $group['values'] !== [] ? $group['sum'] / count($group['values']) : 0.0,
            'min' => $group['min'] ?? 0,
            'max' => $group['max'] ?? 0,
            default => $group['count'],
        };
    }

    /**
     * @param  array<int, array{key: string, label: string, type: string}>  $columns
     */
    private function columnType(array $columns, string $key): string
    {
        foreach ($columns as $column) {
            if ($column['key'] === $key) {
                return $column['type'] ?? 'string';
            }
        }

        return 'string';
    }

    private function dateGroupLabel(mixed $value, string $grouping): ?string
    {
        $date = $this->parseDate($value);

        if ($date === null) {
            return null;
        }

        return match ($grouping) {
            'day' => $date->format('Y-m-d'),
            'year' => $date->format('Y'),
            default => $date->format('Y-m'),
        };
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        if ($value === '' || is_numeric($value)) {
            return null;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
            try {
                return Carbon::createFromFormat('Y-m-d', substr($value, 0, 10))->startOfDay();
            } catch (Throwable) {
            }
        }

        if (preg_match('#^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$#', $value, $matches)) {
            try {
                return Carbon::createFromFormat('d/m/Y', $matches[1].'/'.$matches[2].'/'.$matches[3])->startOfDay();
            } catch (Throwable) {
            }
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }
}
