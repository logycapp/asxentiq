<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PowerbiData extends Model
{
    protected $table = 'powerbi_datas';

    protected $fillable = [
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
    ];

    protected function casts(): array
    {
        return [
            'source_row_number' => 'integer',
            'fecha_siniestro' => 'datetime',
            'raw_data' => 'array',
        ];
    }
}
