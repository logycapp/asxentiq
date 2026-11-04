<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingAudioIndexationQuestion extends Model
{
    protected $fillable = [
        'training_audio_indexation_id',
        'question_id',
        'theme_order',
        'sort_order',
    ];

    public function indexation(): BelongsTo
    {
        return $this->belongsTo(TrainingAudioIndexation::class, 'training_audio_indexation_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
