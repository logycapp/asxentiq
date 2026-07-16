<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingAudioIndexation extends Model
{
    protected $fillable = [
        'training_id',
        'audio_path',
        'result_data',
        'indexed_at',
    ];

    protected function casts(): array
    {
        return [
            'result_data' => 'array',
            'indexed_at' => 'datetime',
        ];
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }
}
