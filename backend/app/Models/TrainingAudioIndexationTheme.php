<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingAudioIndexationTheme extends Model
{
    protected $fillable = [
        'training_audio_indexation_id',
        'theme_order',
        'theme_text',
        'start_seconds',
        'end_seconds',
    ];

    protected function casts(): array
    {
        return [
            'theme_order' => 'integer',
            'start_seconds' => 'integer',
            'end_seconds' => 'integer',
        ];
    }

    public function indexation(): BelongsTo
    {
        return $this->belongsTo(TrainingAudioIndexation::class, 'training_audio_indexation_id');
    }
}
