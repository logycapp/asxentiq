<?php

namespace App\PowerbiTransformers;

use App\Contracts\PowerbiTransformerContract;

abstract class AbstractPowerbiTransformer implements PowerbiTransformerContract
{
    /** @var array<string, string> mapa de column key original → key transformada */
    protected array $columnMap = [];

    public function transformColumns(array $columns): array
    {
        return $columns;
    }

    public function transformRow(array $row): array
    {
        if ($this->columnMap === []) {
            return $row;
        }

        $mapped = [];

        foreach ($row as $key => $value) {
            $mapped[$this->columnMap[$key] ?? $key] = $value;
        }

        return $mapped;
    }
}
