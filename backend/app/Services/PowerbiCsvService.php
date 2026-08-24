<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Normalizer;
use RuntimeException;
use Throwable;

/**
 * Pipeline de normalización y parseo de archivos CSV:
 * encoding → UTF-8 (BOM UTF-8/UTF-16, Windows-1252/latin1), delimitador
 * con soporte de comillas, parseo respetando valores citados y comillas
 * escapadas, saneamiento de caracteres (ñ/acentos correctos en NFC),
 * encabezados deduplicados y clasificación de columnas (string|numeric|date).
 */
class PowerbiCsvService
{
    private const DELIMITER_CANDIDATES = [',', ';', "\t", '|'];

    private const PREVIEW_LIMIT = 20;

    /**
     * @return array{
     *   columns: array<int, array{key: string, label: string, type: string}>,
     *   rows: array<int, array<string, mixed>>,
     *   row_count: int,
     *   preview_rows: array<int, array<string, mixed>>,
     *   delimiter: string,
     *   encoding: string
     * }
     */
    public function parse(string $content): array
    {
        $normalized = $this->normalizeContent($content);
        $delimiter = $this->detectDelimiter($normalized['content']);

        $rows = $this->parseRows($normalized['content'], $delimiter);
        $rows = $this->cleanRows($rows);

        if ($rows === []) {
            throw new RuntimeException('El archivo CSV no contiene filas con datos utilizables.');
        }

        $rawHeaders = array_shift($rows);
        $columns = $this->buildColumns($rawHeaders);
        $rows = $this->buildRows($columns, $rows);
        $classification = $this->classifyColumns($columns, $rows);

        return [
            'columns' => $classification['columns'],
            'rows' => $rows,
            'row_count' => count($rows),
            'preview_rows' => array_slice($rows, 0, self::PREVIEW_LIMIT),
            'delimiter' => $delimiter,
            'encoding' => $normalized['encoding'],
        ];
    }

    /**
     * @return array{content: string, encoding: string}
     */
    private function normalizeContent(string $content): array
    {
        if ($content === '') {
            throw new RuntimeException('El archivo CSV está vacío.');
        }

        $encoding = 'UTF-8';

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        } elseif (str_starts_with($content, "\xFF\xFE")) {
            $content = mb_convert_encoding(substr($content, 2), 'UTF-8', 'UTF-16LE');
            $encoding = 'UTF-16LE';
        } elseif (str_starts_with($content, "\xFE\xFF")) {
            $content = mb_convert_encoding(substr($content, 2), 'UTF-8', 'UTF-16BE');
            $encoding = 'UTF-16BE';
        } else {
            $detected = mb_detect_encoding($content, ['UTF-8', 'Windows-1252', 'ISO-8859-1', 'ASCII'], true);

            if ($detected === false) {
                $detected = 'Windows-1252';
            }

            if (! in_array($detected, ['UTF-8', 'ASCII'], true)) {
                $content = mb_convert_encoding($content, 'UTF-8', $detected);
                $encoding = $detected;
            }
        }

        $content = $this->sanitizeControlChars($content);

        if (class_exists(Normalizer::class)) {
            $content = Normalizer::normalize($content, Normalizer::FORM_C) ?: $content;
        }

        return [
            'content' => $content,
            'encoding' => $encoding,
        ];
    }

    private function sanitizeControlChars(string $content): string
    {
        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $content) ?? $content;
    }

    private function normalizeLineEndings(string $content): string
    {
        $content = str_replace(["\r\n", "\r"], "\n", $content);

        return $content;
    }

    private function detectDelimiter(string $content): string
    {
        $content = $this->normalizeLineEndings($content);
        $lines = $this->firstLines($content, 20);

        $best = ',';
        $bestScore = -1;

        foreach (self::DELIMITER_CANDIDATES as $candidate) {
            $total = 0;
            $counts = [];

            foreach ($lines as $line) {
                $count = $this->countOutsideQuotes($line, $candidate);

                if ($count > 0) {
                    $counts[] = $count;
                    $total += $count;
                }
            }

            if ($total === 0) {
                continue;
            }

            $consistent = $counts !== [] && count(array_unique($counts)) === 1;
            $score = ($total * 2) + ($consistent ? 1 : 0);

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $candidate;
            }
        }

        return $best;
    }

    /**
     * @return array<int, string>
     */
    private function firstLines(string $content, int $limit): array
    {
        $lines = explode("\n", $content);
        $lines = array_slice($lines, 0, $limit);

        return array_values(array_filter($lines, fn (string $line): bool => trim($line) !== ''));
    }

    private function countOutsideQuotes(string $line, string $delimiter): int
    {
        $count = 0;
        $inQuotes = false;
        $length = strlen($line);

        for ($i = 0; $i < $length; $i++) {
            $char = $line[$i];

            if ($char === '"') {
                if ($inQuotes && $i + 1 < $length && $line[$i + 1] === '"') {
                    $i++;

                    continue;
                }

                $inQuotes = ! $inQuotes;

                continue;
            }

            if ($char === $delimiter && ! $inQuotes) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    private function parseRows(string $content, string $delimiter): array
    {
        $content = $this->normalizeLineEndings($content);
        $rows = [];
        $stream = fopen('php://temp', 'r+');

        if ($stream === false) {
            throw new RuntimeException('No fue posible procesar el archivo CSV.');
        }

        fwrite($stream, $content);
        rewind($stream);

        try {
            while (($row = fgetcsv($stream, 0, $delimiter, '"')) !== false) {
                if ($row === [null] || $row === []) {
                    continue;
                }

                $rows[] = $row;
            }
        } finally {
            fclose($stream);
        }

        return $rows;
    }

    /**
     * @param  array<int, array<int, mixed>>  $rows
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
     * @param  array<int, mixed>  $headers
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
     * @param  array<int, array{key: string, label: string}>  $columns
     * @param  array<int, array<int, mixed>>  $rows
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
     * @param  array<int, array{key: string, label: string}>  $columns
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{columns: array<int, array{key: string, label: string, type: string}>}
     */
    private function classifyColumns(array $columns, array $rows): array
    {
        $classified = [];

        foreach ($columns as $column) {
            $classified[] = [
                'key' => $column['key'],
                'label' => $column['label'],
                'type' => $this->classifyColumn($column['key'], $rows),
            ];
        }

        return ['columns' => $classified];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function classifyColumn(string $key, array $rows): string
    {
        $nonEmpty = 0;
        $numeric = 0;
        $date = 0;

        foreach ($rows as $row) {
            $value = $row[$key] ?? null;

            if ($value === null || $value === '') {
                continue;
            }

            $nonEmpty++;

            if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
                $numeric++;
            }

            if ($this->isDateValue($value)) {
                $date++;
            }
        }

        if ($nonEmpty > 0 && $numeric === $nonEmpty) {
            return 'numeric';
        }

        if ($nonEmpty > 0 && $date === $nonEmpty) {
            return 'date';
        }

        if ($nonEmpty >= 3 && $date >= $nonEmpty * 0.8) {
            return 'date';
        }

        return 'string';
    }

    private function isDateValue(mixed $value): bool
    {
        return $this->parseDate($value) !== null;
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

    public function normalizeValue(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? $value;
            $value = trim($value);

            if ($value !== '' && class_exists(Normalizer::class)) {
                $value = Normalizer::normalize($value, Normalizer::FORM_C) ?: $value;
            }

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
