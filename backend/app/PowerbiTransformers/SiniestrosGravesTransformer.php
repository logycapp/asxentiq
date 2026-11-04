<?php

namespace App\PowerbiTransformers;

use Normalizer;

/**
 * Ejemplo de referencia: normaliza un CSV de siniestros graves al esquema
 * fijo migrado desde la tabla `powerbi_datas` (proyecto "Siniestros Graves").
 *
 * El parseo genérico corre primero (encoding, delimitador, tipos); esta clase
 * solo renombra las columnas detectadas por label para usar keys estables.
 * Si cambia su lógica, el dataset debe re-importarse.
 */
class SiniestrosGravesTransformer extends AbstractPowerbiTransformer
{
    private const MAPPING = [
        'NUMERO_SINIESTRO' => ['numero_siniestro', 'Número siniestro', 'string'],
        'NO_IDENTIFICACION' => ['no_identificacion', 'No. identificación', 'string'],
        'NIT' => ['nit', 'NIT', 'string'],
        'FECHA_SINIESTRO' => ['fecha_siniestro', 'Fecha siniestro', 'date'],
        'CAUSAL_EVENTO_GRAVE' => ['causal_evento_grave', 'Causal evento grave', 'string'],
        'MUNICIPIO_OCURRENCIA_SINIESTRO' => ['municipio_ocurrencia_siniestro', 'Municipio ocurrencia siniestro', 'string'],
        'DEPARTAMENTO_OCURRENCIA_SINIESTRO' => ['departamento_ocurrencia_siniestro', 'Departamento ocurrencia siniestro', 'string'],
        'CIE_10_DX_1' => ['cie_10_dx_1', 'CIE-10 DX 1', 'string'],
        'NOMBRE_DX_1' => ['nombre_dx_1', 'Nombre DX 1', 'string'],
        'DETALLE' => ['detalle', 'Detalle', 'string'],
        'MECANISMO' => ['mecanismo', 'Mecanismo', 'string'],
    ];

    public function transformColumns(array $columns): array
    {
        return array_map(function (array $column): array {
            $normalizedLabel = $this->normalizeLabel($column['label']);

            if (! isset(self::MAPPING[$normalizedLabel])) {
                return $column;
            }

            [$key, $label, $type] = self::MAPPING[$normalizedLabel];

            $this->columnMap[$column['key']] = $key;

            return [
                'key' => $key,
                'label' => $label,
                'type' => $type,
            ];
        }, $columns);
    }

    private function normalizeLabel(string $label): string
    {
        $label = mb_strtoupper(trim($label));

        if (class_exists(Normalizer::class)) {
            $decomposed = Normalizer::normalize($label, Normalizer::FORM_D);

            if ($decomposed !== false) {
                $label = preg_replace('/\p{Mn}/u', '', $decomposed) ?? $label;
            }
        }

        $label = preg_replace('/[^A-Z0-9]+/', '_', $label) ?? $label;

        return trim($label, '_');
    }
}
