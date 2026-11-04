<?php

return [
    /*
    | Transformadores de datos por proyecto.
    | La clave es el valor aceptado en `powerbi_projects.handler` (whitelist).
    | Nunca se instancia una clase proveniente de input del usuario.
    */
    'transformers' => [
        'siniestros_graves' => \App\PowerbiTransformers\SiniestrosGravesTransformer::class,
    ],

    'chart_types' => ['bar', 'line', 'area', 'pie', 'kpi', 'table'],

    'aggregations' => ['count', 'sum', 'avg', 'min', 'max'],

    'date_groupings' => ['day', 'month', 'year'],

    'max_file_size_kb' => 20480,
];
