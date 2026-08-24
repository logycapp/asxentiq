<?php

namespace App\Contracts;

interface PowerbiTransformerContract
{
    /**
     * Post-procesa las columnas detectadas por el parseo genérico.
     *
     * @param  array<int, array{key: string, label: string, type: string}>  $columns
     * @return array<int, array{key: string, label: string, type: string}>
     */
    public function transformColumns(array $columns): array;

    /**
     * Post-procesa una fila normalizada (llaveada por column key).
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public function transformRow(array $row): array;
}
