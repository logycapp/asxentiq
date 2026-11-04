<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PowerbiVisualization extends Model
{
    protected $table = 'powerbi_visualizations';

    protected $fillable = [
        'project_id',
        'dataset_id',
        'title',
        'chart_type',
        'config',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'project_id' => 'integer',
            'dataset_id' => 'integer',
            'config' => 'array',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(PowerbiProject::class, 'project_id');
    }

    public function dataset(): BelongsTo
    {
        return $this->belongsTo(PowerbiDataset::class, 'dataset_id');
    }
}
