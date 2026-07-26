<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingParticipant;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;
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
        $passed = $participant->passed !== null
            ? (bool) $participant->passed
            : $participant->score >= $training->passing_score;

        $data = [
            'user_name' => $participant->full_name,
            'document_number' => $participant->document_number,
            'training_title' => $training->title,
            'training_type' => $training->type,
            'score' => $participant->score,
            'passed' => $passed,
            'passing_score' => $training->passing_score,
            'completed_at' => $participant->completed_at,
            'date' => now()->format('d/m/Y'),
        ];

        $pdf = Pdf::loadView('certificates.training', $data);

        $filename = 'certificado-' . Str::slug($training->title) . '-' . $participant->document_number . '.pdf';

        return $pdf->download($filename);
    }
}
