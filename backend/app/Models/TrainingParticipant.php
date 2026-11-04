<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingParticipant extends Model
{
    protected $fillable = [
        'training_id',
        'empresa_id',
        'document_number',
        'full_name',
        'email',
        'phone',
        'active',
        'attended',
        'score',
        'passed',
        'observations',
        'attendance_date',
        'completed_at',
        'attempt_started_at',
        'attempts_count',
        'privacy_consent_accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'attended' => 'boolean',
            'passed' => 'boolean',
            'score' => 'decimal:2',
            'attendance_date' => 'date',
            'completed_at' => 'datetime',
            'attempt_started_at' => 'datetime',
            'attempts_count' => 'integer',
            'privacy_consent_accepted_at' => 'datetime',
        ];
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
