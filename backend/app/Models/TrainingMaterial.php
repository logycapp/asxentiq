<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TrainingMaterial extends Model
{
    protected $fillable = [
        'trainable_type',
        'trainable_id',
        'filename',
        'filepath',
        'mime_type',
        'filesize',
        'type',
    ];

    public function trainable(): MorphTo
    {
        return $this->morphTo();
    }
}