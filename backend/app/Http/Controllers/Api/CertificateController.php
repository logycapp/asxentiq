<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CertificateController extends Controller
{
    public function download(Training $training, Request $request)
    {
        $user = $request->user();

        $pivot = $training->users()->where('user_id', $user->id)->first();

        if (!$pivot || !$pivot->pivot->completed_at) {
            return response()->json(['message' => 'No has completado esta capacitacion.'], 422);
        }

        $passed = $pivot->pivot->score !== null && $pivot->pivot->score >= $training->passing_score;

        $data = [
            'user_name' => $user->name,
            'document_number' => $user->document_number,
            'training_title' => $training->title,
            'training_type' => $training->type,
            'score' => $pivot->pivot->score,
            'passed' => $passed,
            'passing_score' => $training->passing_score,
            'completed_at' => $pivot->pivot->completed_at,
            'date' => now()->format('d/m/Y'),
        ];

        $pdf = Pdf::loadView('certificates.training', $data);

        $filename = 'certificado-' . Str::slug($training->title) . '-' . $user->document_number . '.pdf';

        return $pdf->download($filename);
    }
}