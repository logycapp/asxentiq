<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingParticipant;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CertificateController extends Controller
{
    public function download(Training $training, Request $request)
    {
        $token = $request->bearerToken();
        if (! $token || ! str_starts_with($token, 'participant_')) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if (! Cache::has('pt_' . $token)) {
            return response()->json(['message' => 'Sesion de participante expirada.'], 401);
        }

        $parts = explode('_', $token);
        $documentNumber = $parts[1] ?? null;
        if (! $documentNumber) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $participant = TrainingParticipant::query()
            ->where('document_number', $documentNumber)
            ->where('training_id', $training->id)
            ->with(['empresa'])
            ->first();
        if (! $participant) {
            return response()->json(['message' => 'Participante no encontrado.'], 404);
        }

        if (! $participant->completed_at) {
            return response()->json(['message' => 'No has completado esta capacitacion.'], 422);
        }

        if ($participant->score === null) {
            return response()->json(['message' => 'La capacitacion requiere revision manual antes de descargar el certificado.'], 422);
        }

        File::ensureDirectoryExists(storage_path('framework/views'));
        File::ensureDirectoryExists(storage_path('fonts'));
        $training->loadMissing('category');
        $passed = $participant->passed !== null
            ? (bool) $participant->passed
            : $participant->score >= $training->passing_score;

        $verificationUrl = URL::signedRoute('certificates.verify', [
            'training' => $training->id,
            'participant' => $participant->id,
        ]);

        $qrImageDataUrl = $this->generateQrDataUrl($verificationUrl);
        $companyLogoDataUrl = $this->generateCompanyLogoDataUrl(
            $participant->empresa?->logo_path,
            $participant->empresa?->name ?? 'Asxentiq SAS'
        );
        $backgroundImageDataUrl = $this->generateBackgroundImageDataUrl();
        $certificateCode = strtoupper(substr(hash_hmac(
            'sha256',
            $training->id . '|' . $participant->id . '|' . ($participant->completed_at?->toISOString() ?? '') . '|' . ($participant->score ?? '0'),
            config('app.key')
        ), 0, 12));

        $data = [
            'user_name' => $participant->full_name,
            'document_number' => $participant->document_number,
            'training_title' => $training->title,
            'training_category' => $training->category?->name,
            'duration_hours' => $training->duration_hours,
            'company_name' => $participant->empresa?->name,
            'company_logo_data_url' => $companyLogoDataUrl,
            'score' => $participant->score,
            'passed' => $passed,
            'passing_score' => $training->passing_score,
            'completed_at' => $participant->completed_at,
            'date' => now()->format('d/m/Y'),
            'certificate_code' => $certificateCode,
            'verification_url' => $verificationUrl,
            'qr_image_data_url' => $qrImageDataUrl,
            'background_image_data_url' => $backgroundImageDataUrl,
        ];

        $pdf = Pdf::loadView('certificates.training', $data)
            ->setPaper('a4', 'landscape')
            ->setOption([
                'isRemoteEnabled' => false,
                'isHtml5ParserEnabled' => true,
            ]);

        $filename = 'certificado-' . Str::slug($training->title) . '-' . $participant->document_number . '.pdf';

        return $pdf->download($filename);
    }

    private function generateQrDataUrl(string $text): ?string
    {
        try {
            $renderer = new ImageRenderer(new RendererStyle(240, 0), new SvgImageBackEnd());
            $writer = new Writer($renderer);
            $svg = $writer->writeString($text);

            return 'data:image/svg+xml;base64,' . base64_encode($svg);
        } catch (\Throwable) {
            return null;
        }
    }

    private function generateCompanyLogoDataUrl(?string $logoPath, string $companyName): ?string
    {
        // Cargar el logo principal de Asxentiq desde /assets/template/logos/logo_principal/logo_light.png
        $mainLogoPath = base_path('../frontend/src/assets/template/logos/logo_principal/logo_light.png');
        if (File::exists($mainLogoPath)) {
            try {
                $mimeType = File::mimeType($mainLogoPath) ?: 'image/png';
                $contents = File::get($mainLogoPath);
                return 'data:' . $mimeType . ';base64,' . base64_encode($contents);
            } catch (\Throwable) {
                // fallback a SVG
            }
        }

        // Fallback: SVG con iniciales
        $initials = collect(preg_split('/\s+/', trim($companyName)) ?: [])
            ->filter()
            ->map(fn (string $part) => Str::substr($part, 0, 1))
            ->take(3)
            ->implode('');

        $initials = strtoupper($initials !== '' ? $initials : 'AS');
        $label = htmlspecialchars(mb_strtoupper(trim($companyName)), ENT_QUOTES, 'UTF-8');

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect x="2" y="2" width="92" height="92" rx="22" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
  <circle cx="48" cy="40" r="19" fill="#2563eb"/>
  <text x="48" y="46" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="800" fill="#ffffff">{$initials}</text>
  <text x="48" y="73" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="7.5" font-weight="700" fill="#334155">{$label}</text>
</svg>
SVG;

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    private function generateBackgroundImageDataUrl(): ?string
    {
        $backgroundPath = public_path('certificates/background_certificate.png');

        if (! File::exists($backgroundPath)) {
            return null;
        }

        try {
            $mimeType = File::mimeType($backgroundPath) ?: 'image/png';
            $contents = File::get($backgroundPath);

            return 'data:' . $mimeType . ';base64,' . base64_encode($contents);
        } catch (\Throwable) {
            return null;
        }
    }
}
