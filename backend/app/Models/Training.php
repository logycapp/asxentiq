<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Collection;

class Training extends Model
{
    protected $fillable = [
        'title',
        'description',
        'type',
        'modality',
        'scheduled_date',
        'completion_date',
        'duration_hours',
        'location',
        'instructor',
        'mandatory',
        'status',
        'passing_score',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'completion_date' => 'date',
            'mandatory' => 'boolean',
            'passing_score' => 'decimal:2',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'training_user')
            ->withPivot(['attended', 'score', 'observations', 'attendance_date', 'completed_at'])
            ->withTimestamps();
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(TrainingParticipant::class, 'training_participant')
            ->withPivot(['attended', 'score', 'observations', 'attendance_date', 'completed_at'])
            ->withTimestamps();
    }

    public function allAssignees(): Collection
    {
        return $this->users->concat($this->participants);
    }

    public function materials(): MorphMany
    {
        return $this->morphMany(TrainingMaterial::class, 'trainable');
    }
}