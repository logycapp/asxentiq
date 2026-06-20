<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

class TrainingUser extends Pivot
{
    protected $table = 'training_user';

    protected $fillable = [
        'training_id',
        'user_id',
        'attended',
        'score',
        'observations',
        'attendance_date',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'attended' => 'boolean',
            'score' => 'decimal:2',
            'attendance_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(UserAnswer::class, 'training_user_id');
    }
}