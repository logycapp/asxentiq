<?php

return [
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'avatar_model' => env('GEMINI_AVATAR_MODEL', 'gemini-2.5-flash-image'),
        'avatar_prompt' => env('GEMINI_AVATAR_PROMPT', 'Convierte esta foto en un avatar tipo muñeco 3D, limpio, simpatico y profesional, con rasgos suaves y expresivos. Genera un retrato ultra cerrado enfocado unicamente en el rostro: ojos, nariz, boca y frente, con la cara centrada y ocupando casi todo el encuadre. No incluyas hombros, torso, manos ni cuerpo. Evita planos medios o completos. Fondo transparente, formato PNG, sin texto, sin marcas de agua, sin accesorios extra y sin elementos de escenario.'),
        'audio_index_model' => env('GEMINI_AUDIO_INDEX_MODEL', 'gemini-2.5-flash'),
        'audio_index_prompt' => env('GEMINI_AUDIO_INDEX_PROMPT', <<<'PROMPT'
Analiza todo el audio y crea un indice inteligente en JSON para una base de datos.

Objetivo:
Crear un JSON que permita buscar cualquier explicacion dentro del video y reproducir el video desde el segundo donde empieza esa explicacion.

Reglas:
- Analiza todo el audio completo.
- Detecta todos los temas importantes.
- Divide el audio en segmentos por tema o subtema.
- Cada segmento debe tener inicio y fin en segundos.
- Cada segmento debe contener el texto hablado correspondiente.
- Cada segmento debe tener un tema corto y claro.
- Cada segmento debe tener un resumen breve.
- Cada segmento debe tener palabras clave utiles para busqueda.
- Cada segmento debe tener posibles preguntas que un usuario podria hacer.
- No inventes informacion que no este en el audio.
- No mezcles temas diferentes dentro del mismo segmento si se pueden separar.
- Si un mismo tema continua durante mas tiempo, puedes dividirlo en subsegmentos.
- Si una explicacion es muy corta, puedes unirla con el segmento anterior o siguiente si pertenecen al mismo tema.
- Idealmente cada segmento debe durar entre 10 y 45 segundos, pero puede durar mas si el tema lo necesita.
- Mantén el idioma original del audio.
- Devuelve solo JSON valido.
- No agregues texto antes ni despues del JSON.
- No uses markdown.
- No uses comentarios.

Estructura exacta de salida:
{
"titulo_detectado": "",
"idioma": "",
"duracion_aproximada_segundos": 0,
"resumen_general": "",
"temas_detectados": [
{
"orden": 1,
"tema": "",
"inicio": 0,
"fin": 0
}
],
"segmentos": [
{
"orden": 1,
"inicio": 0,
"fin": 0,
"tema": "",
"subtema": "",
"resumen": "",
"texto": "",
"palabras_clave": [],
"preguntas_posibles": []
}
]
}

Devuelve unicamente el JSON final con esa estructura.
PROMPT),
    ],
];
