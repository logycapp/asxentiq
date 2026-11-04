<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PowerbiDataset extends Model
{
    protected $table = 'powerbi_datasets';

    protected $fillable = [
        'project_id',
        'source_file',
        'row_count',
        'columns',
        'delimiter',
        'encoding',
        'imported_at',
    ];

    protected function casts(): array
    {
        return [
            'project_id' => 'integer',
            'row_count' => 'integer',
            'columns' => 'array',
            'imported_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(PowerbiProject::class, 'project_id');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(PowerbiRow::class, 'dataset_id');
    }
}
