<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PowerbiRow extends Model
{
    protected $table = 'powerbi_rows';

    protected $fillable = [
        'dataset_id',
        'source_row_number',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'dataset_id' => 'integer',
            'source_row_number' => 'integer',
            'data' => 'array',
        ];
    }

    public function dataset(): BelongsTo
    {
        return $this->belongsTo(PowerbiDataset::class, 'dataset_id');
    }
}
