<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TrainingParticipant extends Model
{
    protected $fillable = [
        'document_number',
        'full_name',
        'email',
        'phone',
    ];

    public function trainings(): BelongsToMany
    {
        return $this->belongsToMany(Training::class, 'training_participant')
            ->withPivot(['attended', 'score', 'passed', 'observations', 'attendance_date', 'completed_at'])
            ->withTimestamps();
    }
}
