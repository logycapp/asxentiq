<?php

namespace App\Http\Controllers\Api;

use App\Exports\ParticipantsExport;
use App\Imports\ParticipantsImport;
use App\Http\Controllers\Controller;
use App\Models\TrainingParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;

class ParticipantController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $user?->loadMissing('roleRelation');
        $shouldRestrictByCompany = $user?->empresa_id && $user?->roleRelation?->slug !== 'admin';

        $participants = TrainingParticipant::query()
            ->with('empresa:id,name,active')
            ->when(
                $shouldRestrictByCompany,
                fn ($query) => $query->where('empresa_id', $user->empresa_id)
            )
            ->orderBy('full_name')
            ->get();

        return response()->json($participants);
    }

    public function export()
    {
        return Excel::download(new ParticipantsExport(), 'reporte-participantes.xlsx');
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        $import = new ParticipantsImport();
        Excel::import($import, $request->file('file'));

        $summary = $import->summary();

        return response()->json([
            'message' => 'Carga masiva procesada correctamente.',
            'created' => $summary['created'],
            'updated' => $summary['updated'],
            'skipped' => $summary['skipped'],
            'errors' => $summary['errors'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'empresa_id' => ['required', 'integer', 'exists:empresas,id'],
            'document_number' => ['required', 'string', 'max:20', 'unique:training_participants,document_number'],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $participant = TrainingParticipant::query()->create($data);

        return response()->json([
            'message' => 'Participante registrado correctamente.',
            'participant' => $participant->load('empresa:id,name'),
        ], 201);
    }

    public function show(TrainingParticipant $trainingParticipant): JsonResponse
    {
        return response()->json($trainingParticipant->load('empresa:id,name'));
    }

    public function update(Request $request, TrainingParticipant $trainingParticipant): JsonResponse
    {
        $data = $request->validate([
            'empresa_id' => ['required', 'integer', 'exists:empresas,id'],
            'document_number' => ['required', 'string', 'max:20', 'unique:training_participants,document_number,' . $trainingParticipant->id],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $trainingParticipant->update($data);

        return response()->json([
            'message' => 'Participante actualizado correctamente.',
            'participant' => $trainingParticipant->fresh()->load('empresa:id,name'),
        ]);
    }

    public function destroy(TrainingParticipant $trainingParticipant): JsonResponse
    {
        $trainingParticipant->trainings()->detach();
        $trainingParticipant->delete();

        return response()->json([
            'message' => 'Participante eliminado correctamente.',
        ]);
    }
}
