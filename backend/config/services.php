<?php

return [
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'avatar_model' => env('GEMINI_AVATAR_MODEL', 'gemini-2.5-flash-image'),
        'avatar_prompt' => env('GEMINI_AVATAR_PROMPT', 'Convierte esta foto en un avatar tipo muñeco 3D, limpio, simpatico y profesional, con rasgos suaves y expresivos, cabeza y hombros centrados, sin fondo visible, fondo transparente, formato PNG, sin texto, sin marcas de agua, sin accesorios extra y sin elementos de escenario.'),
    ],
];
