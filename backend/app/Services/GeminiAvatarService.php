<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GeminiAvatarService
{
    public function generateFromPhoto(string $photoPath): ?string
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.avatar_model');

        if (! $apiKey || ! $model) {
            return null;
        }

        if (! Storage::disk('public')->exists($photoPath)) {
            return null;
        }

        $photoContents = Storage::disk('public')->get($photoPath);
        $mimeType = Storage::disk('public')->mimeType($photoPath) ?: 'image/png';

        $response = Http::timeout(120)
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
                                'text' => config('services.gemini.avatar_prompt'),
                            ],
                            [
                                'inlineData' => [
                                    'mimeType' => $mimeType,
                                    'data' => base64_encode($photoContents),
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('No fue posible generar el avatar con Gemini.', [
                'photoPath' => $photoPath,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $imageData = $this->extractImageData($response->json());

        if (! $imageData) {
            Log::warning('Gemini no devolvio una imagen para el avatar.', [
                'photoPath' => $photoPath,
                'response' => $response->json(),
            ]);

            return null;
        }

        $binary = base64_decode($imageData, true);

        if ($binary === false) {
            return null;
        }

        $avatarPath = 'profile-avatars/' . Str::uuid() . '.png';
        Storage::disk('public')->put($avatarPath, $binary);

        return $avatarPath;
    }

    private function extractImageData(array $response): ?string
    {
        foreach (($response['candidates'] ?? []) as $candidate) {
            foreach ((data_get($candidate, 'content.parts') ?? []) as $part) {
                $inlineData = data_get($part, 'inlineData') ?? data_get($part, 'inline_data');

                if (is_array($inlineData)) {
                    $data = $inlineData['data'] ?? $inlineData['base64'] ?? null;

                    if (is_string($data) && $data !== '') {
                        return $data;
                    }
                }

                $directData = $part['data'] ?? null;

                if (is_string($directData) && $directData !== '') {
                    return $directData;
                }
            }
        }

        $fallback = data_get($response, 'output[0].data');

        return is_string($fallback) && $fallback !== '' ? $fallback : null;
    }
}
