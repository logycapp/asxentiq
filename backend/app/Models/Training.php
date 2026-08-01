<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Collection;

class Training extends Model
{
    protected $fillable = [
        'title',
        'training_category_id',
        'description',
        'modality',
        'scheduled_date',
        'completion_date',
        'duration_hours',
        'location',
        'instructor',
        'mandatory',
        'material_with_indexation',
        'status',
        'passing_score',
        'max_attempts',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'completion_date' => 'date',
            'mandatory' => 'boolean',
            'material_with_indexation' => 'boolean',
            'passing_score' => 'decimal:2',
            'max_attempts' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TrainingCategory::class, 'training_category_id');
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

    public function participants(): HasMany
    {
        return $this->hasMany(TrainingParticipant::class);
    }

    public function allAssignees(): Collection
    {
        return $this->users->concat($this->participants);
    }

    public function materials(): MorphMany
    {
        return $this->morphMany(TrainingMaterial::class, 'trainable');
    }

    public function latestMaterial(): MorphOne
    {
        return $this->morphOne(TrainingMaterial::class, 'trainable')->latestOfMany();
    }

    public function audioIndexation(): HasOne
    {
        return $this->hasOne(TrainingAudioIndexation::class);
    }
}
