<?php

namespace App\Http\Controllers;

use App\Models\Training;
use App\Models\TrainingParticipant;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class CertificateValidationController extends Controller
{
    public function show(Request $request, Training $training, TrainingParticipant $participant)
    {
        $validSignature = $request->hasValidSignature();
        $belongsToTraining = $participant->training_id === $training->id;
        $isCompleted = (bool) $participant->completed_at && $participant->score !== null;

        $participant->loadMissing('empresa');
        $training->loadMissing('category');

        return response()->view('certificates.verify', [
            'valid' => $validSignature && $belongsToTraining && $isCompleted,
            'signature_valid' => $validSignature,
            'belongs_to_training' => $belongsToTraining,
            'is_completed' => $isCompleted,
            'training' => $training,
            'participant' => $participant,
            'company_name' => $participant->empresa?->name,
            'company_logo_data_url' => $this->generateCompanyLogoDataUrl(
                $participant->empresa?->logo_path,
                $participant->empresa?->name ?? 'Asxentiq SAS'
            ),
            'verification_url' => $request->fullUrl(),
            'qr_image_data_url' => $this->generateQrDataUrl($request->fullUrl()),
            'certificate_code' => strtoupper(substr(hash_hmac(
                'sha256',
                $training->id . '|' . $participant->id . '|' . ($participant->completed_at?->toISOString() ?? '') . '|' . ($participant->score ?? '0'),
                config('app.key')
            ), 0, 12)),
            'verified_at' => now(),
        ]);
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
        if ($logoPath && extension_loaded('gd')) {
            try {
                $disk = Storage::disk('public');
                if ($disk->exists($logoPath)) {
                    $fullPath = $disk->path($logoPath);
                    $mimeType = File::mimeType($fullPath) ?: 'image/png';
                    $contents = File::get($fullPath);

                    return 'data:' . $mimeType . ';base64,' . base64_encode($contents);
                }
            } catch (\Throwable) {
                // Si el logo no se puede leer, usamos emblema vectorial.
            }
        }

        return $this->generateCompanyBadgeDataUrl($companyName);
    }

    private function generateCompanyBadgeDataUrl(string $companyName): string
    {
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
}
