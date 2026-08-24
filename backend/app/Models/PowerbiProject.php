<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PowerbiProject extends Model
{
    protected $table = 'powerbi_projects';

    protected $fillable = [
        'empresa_id',
        'name',
        'description',
        'status',
        'public_token',
        'handler',
    ];

    protected function casts(): array
    {
        return [
            'empresa_id' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function datasets(): HasMany
    {
        return $this->hasMany(PowerbiDataset::class, 'project_id');
    }

    public function visualizations(): HasMany
    {
        return $this->hasMany(PowerbiVisualization::class, 'project_id');
    }

    public function generatePublicToken(): string
    {
        return Str::uuid()->toString();
    }

    public function isPublished(): bool
    {
        return $this->status === 'published' && $this->public_token !== null;
    }
}
