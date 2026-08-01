<?php

namespace App\Exports;

use App\Models\Question;
use App\Models\Training;
use App\Models\TrainingParticipant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TrainingParticipantsAnswersDetailedExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private readonly Training $training)
    {
    }

    public function collection(): Collection
    {
        $participants = $this->training->participants()
            ->with('empresa:id,name')
            ->orderBy('full_name')
            ->get();

        $questions = $this->training->questions()
            ->with(['options' => function ($query): void {
                $query->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        if ($participants->isEmpty() || $questions->isEmpty()) {
            return collect();
        }

        $answers = DB::table('participant_answers as pa')
            ->leftJoin('question_options as qo', 'pa.selected_option_id', '=', 'qo.id')
            ->whereIn('pa.training_participant_id', $participants->pluck('id'))
            ->whereIn('pa.question_id', $questions->pluck('id'))
            ->select([
                'pa.training_participant_id',
                'pa.question_id',
                'pa.answer_text',
                'pa.selected_option_id',
                'pa.is_correct',
                'pa.score',
                'pa.answered_at',
                'qo.option_text as selected_option_text',
            ])
            ->get()
            ->groupBy('training_participant_id');

        $rows = collect();

        foreach ($participants as $participant) {
            $participantAnswers = $answers->get($participant->id, collect())->keyBy('question_id');

            foreach ($questions as $question) {
                $answer = $participantAnswers->get($question->id);

                $rows->push([
                    'document_number' => $participant->document_number,
                    'full_name' => $participant->full_name,
                    'email' => $participant->email,
                    'phone' => $participant->phone,
                    'empresa' => $participant->empresa?->name ?? 'Sin empresa',
                    'question_order' => $question->order,
                    'question_text' => $question->question_text,
                    'question_type' => $question->type,
                    'expected_answer_text' => $this->expectedAnswerText($question),
                    'participant_answer_text' => $this->participantAnswerText($question, $answer),
                    'is_correct' => $this->correctLabel($answer?->is_correct),
                    'question_score' => $answer?->score !== null ? $answer->score . '%' : 'Pendiente de revision',
                    'answered_at' => $answer?->answered_at ? \Illuminate\Support\Carbon::parse($answer->answered_at)->format('d/m/Y H:i') : '-',
                    'participant_score' => $participant->score !== null ? $participant->score . '%' : '-',
                    'participant_result' => $this->participantResult($participant),
                    'completed_at' => $participant->completed_at?->format('d/m/Y H:i') ?? '-',
                    'observations' => $participant->observations ?: '-',
                ]);
            }
        }

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Cedula',
            'Nombre',
            'Email',
            'Telefono',
            'Empresa',
            'Orden pregunta',
            'Pregunta',
            'Tipo',
            'Respuesta esperada',
            'Respuesta participante',
            'Correcta',
            'Puntaje pregunta',
            'Respondida el',
            'Puntaje final',
            'Resultado final',
            'Completado el',
            'Observaciones',
        ];
    }

    public function map($row): array
    {
        return [
            $row['document_number'],
            $row['full_name'],
            $row['email'],
            $row['phone'],
            $row['empresa'],
            $row['question_order'],
            $row['question_text'],
            $row['question_type'],
            $row['expected_answer_text'],
            $row['participant_answer_text'],
            $row['is_correct'],
            $row['question_score'],
            $row['answered_at'],
            $row['participant_score'],
            $row['participant_result'],
            $row['completed_at'],
            $row['observations'],
        ];
    }

    private function expectedAnswerText(Question $question): string
    {
        if ($question->type === 'open') {
            return 'Revision manual';
        }

        $correctAnswers = $question->options
            ->where('is_correct', true)
            ->pluck('option_text')
            ->filter()
            ->values();

        return $correctAnswers->isNotEmpty()
            ? $correctAnswers->implode(', ')
            : 'Sin respuesta correcta configurada';
    }

    private function participantAnswerText(Question $question, mixed $answer): string
    {
        if (! $answer) {
            return 'Sin respuesta registrada';
        }

        if ($question->type === 'open') {
            return $answer->answer_text ?: 'Sin respuesta registrada';
        }

        return $answer->selected_option_text ?: $answer->answer_text ?: 'Sin respuesta registrada';
    }

    private function correctLabel(mixed $isCorrect): string
    {
        if ($isCorrect === null) {
            return 'Pendiente de revision';
        }

        return $isCorrect ? 'Si' : 'No';
    }

    private function participantResult(TrainingParticipant $participant): string
    {
        if ($participant->score === null) {
            return 'Pendiente de revision';
        }

        return $participant->score >= ($this->training->passing_score ?? 70)
            ? 'Aprobado'
            : 'No Aprobado';
    }
}
