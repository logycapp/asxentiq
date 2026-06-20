<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParticipantController extends Controller
{
    public function index(): JsonResponse
    {
        $participants = TrainingParticipant::query()->orderBy('full_name')->get();

        return response()->json($participants);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_number' => ['required', 'string', 'max:20', 'unique:training_participants,document_number'],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $participant = TrainingParticipant::query()->create($data);

        return response()->json([
            'message' => 'Participante registrado correctamente.',
            'participant' => $participant,
        ], 201);
    }

    public function show(TrainingParticipant $trainingParticipant): JsonResponse
    {
        return response()->json($trainingParticipant);
    }

    public function update(Request $request, TrainingParticipant $trainingParticipant): JsonResponse
    {
        $data = $request->validate([
            'document_number' => ['required', 'string', 'max:20', 'unique:training_participants,document_number,' . $trainingParticipant->id],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $trainingParticipant->update($data);

        return response()->json([
            'message' => 'Participante actualizado correctamente.',
            'participant' => $trainingParticipant->fresh(),
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