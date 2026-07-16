<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GeminiAudioIndexService
{
    public function analyzeFromAudio(string $audioPath): ?array
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.audio_index_model');

        if (! $apiKey || ! $model) {
            return null;
        }

        if (! Storage::disk('public')->exists($audioPath)) {
            return null;
        }

        $audioContents = Storage::disk('public')->get($audioPath);
        $mimeType = Storage::disk('public')->mimeType($audioPath) ?: 'audio/mpeg';

        $response = Http::timeout(300)
            ->acceptJson()
            ->withHeaders([
                'x-goog-api-key' => $apiKey,
            ])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            [
                                'text' => config('services.gemini.audio_index_prompt'),
                            ],
                            [
                                'inlineData' => [
                                    'mimeType' => $mimeType,
                                    'data' => base64_encode($audioContents),
                                ],
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.2,
                    'responseMimeType' => 'application/json',
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('No fue posible analizar el audio con Gemini.', [
                'audioPath' => $audioPath,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $structuredData = $this->extractStructuredJson($response->json());

        if (! $structuredData) {
            Log::warning('Gemini no devolvio un JSON valido para el indice de audio.', [
                'audioPath' => $audioPath,
                'response' => $response->json(),
            ]);

            return null;
        }

        return $structuredData;
    }

    private function extractStructuredJson(array $response): ?array
    {
        $text = $this->extractText($response);

        if (! $text) {
            return null;
        }

        $decoded = $this->decodeJsonText($text);

        if (! is_array($decoded)) {
            return null;
        }

        return $this->normalizePayload($decoded);
    }

    private function extractText(array $response): ?string
    {
        foreach (($response['candidates'] ?? []) as $candidate) {
            foreach ((data_get($candidate, 'content.parts') ?? []) as $part) {
                $text = $part['text'] ?? data_get($part, 'text');

                if (is_string($text) && trim($text) !== '') {
                    return trim($text);
                }
            }
        }

        $fallback = data_get($response, 'output[0].text') ?? data_get($response, 'output[0].data');

        return is_string($fallback) && trim($fallback) !== '' ? trim($fallback) : null;
    }

    private function decodeJsonText(string $text): ?array
    {
        $text = trim($text);
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text) ?? $text;
        $text = preg_replace('/\s*```$/', '', $text) ?? $text;

        $decoded = json_decode($text, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $end <= $start) {
            return null;
        }

        $candidate = substr($text, $start, $end - $start + 1);
        $decoded = json_decode($candidate, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return null;
    }

    private function normalizePayload(array $payload): ?array
    {
        $titulo = $this->normalizeString($payload['titulo_detectado'] ?? null);
        $idioma = $this->normalizeString($payload['idioma'] ?? null);
        $resumenGeneral = $this->normalizeString($payload['resumen_general'] ?? null);
        $duracion = $payload['duracion_aproximada_segundos'] ?? null;

        if ($titulo === null || $idioma === null || $resumenGeneral === null || ! is_numeric($duracion)) {
            return null;
        }

        $temasDetectados = $this->normalizeTemas($payload['temas_detectados'] ?? null);
        $segmentos = $this->normalizeSegmentos($payload['segmentos'] ?? null);

        if ($temasDetectados === null || $segmentos === null) {
            return null;
        }

        return [
            'titulo_detectado' => $titulo,
            'idioma' => $idioma,
            'duracion_aproximada_segundos' => (int) round((float) $duracion),
            'resumen_general' => $resumenGeneral,
            'temas_detectados' => $temasDetectados,
            'segmentos' => $segmentos,
        ];
    }

    private function normalizeTemas(mixed $items): ?array
    {
        if (! is_array($items) || $items === []) {
            return null;
        }

        $normalized = [];

        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                return null;
            }

            $orden = $item['orden'] ?? $index + 1;
            $tema = $this->normalizeString($item['tema'] ?? null);
            $inicio = $item['inicio'] ?? null;
            $fin = $item['fin'] ?? null;

            if (! is_numeric($orden) || $tema === null || ! is_numeric($inicio) || ! is_numeric($fin)) {
                return null;
            }

            $inicioSegundos = (int) round((float) $inicio);
            $finSegundos = (int) round((float) $fin);

            if ($orden < 1 || $inicioSegundos < 0 || $finSegundos < $inicioSegundos) {
                return null;
            }

            $normalized[] = [
                'orden' => (int) $orden,
                'tema' => $tema,
                'inicio' => $inicioSegundos,
                'fin' => $finSegundos,
            ];
        }

        return $normalized === [] ? null : $normalized;
    }

    private function normalizeSegmentos(mixed $items): ?array
    {
        if (! is_array($items) || $items === []) {
            return null;
        }

        $normalized = [];

        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                return null;
            }

            $orden = $item['orden'] ?? $index + 1;
            $inicio = $item['inicio'] ?? null;
            $fin = $item['fin'] ?? null;
            $tema = $this->normalizeString($item['tema'] ?? null);
            $subtema = $this->normalizeString($item['subtema'] ?? '');
            $resumen = $this->normalizeString($item['resumen'] ?? null);
            $texto = $this->normalizeString($item['texto'] ?? null);
            $palabrasClave = $this->normalizeStringList($item['palabras_clave'] ?? null);
            $preguntasPosibles = $this->normalizeStringList($item['preguntas_posibles'] ?? null);

            if (! is_numeric($orden) || ! is_numeric($inicio) || ! is_numeric($fin) || $tema === null || $resumen === null || $texto === null) {
                return null;
            }

            $inicioSegundos = (int) round((float) $inicio);
            $finSegundos = (int) round((float) $fin);

            if ($orden < 1 || $inicioSegundos < 0 || $finSegundos < $inicioSegundos) {
                return null;
            }

            if ($palabrasClave === [] || $preguntasPosibles === []) {
                return null;
            }

            $normalized[] = [
                'orden' => (int) $orden,
                'inicio' => $inicioSegundos,
                'fin' => $finSegundos,
                'tema' => $tema,
                'subtema' => $subtema ?? '',
                'resumen' => $resumen,
                'texto' => $texto,
                'palabras_clave' => $palabrasClave,
                'preguntas_posibles' => $preguntasPosibles,
            ];
        }

        return $normalized === [] ? null : $normalized;
    }

    private function normalizeStringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $normalized = [];

        foreach ($value as $item) {
            if (is_string($item) || is_numeric($item)) {
                $text = trim((string) $item);

                if ($text !== '') {
                    $normalized[] = $text;
                }
            }
        }

        return array_values(array_unique($normalized));
    }

    private function normalizeString(mixed $value): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $text = trim((string) $value);

        return $text !== '' ? $text : null;
    }
}
