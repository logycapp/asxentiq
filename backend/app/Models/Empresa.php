<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Empresa extends Model
{
    protected $fillable = [
        'name',
        'tax_id',
        'address',
        'phone',
        'email',
        'security_token',
        'active',
        'logo_path',
    ];

    protected $appends = [
        'logo_url',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) {
            return null;
        }

        return $this->publicStorageUrl($this->logo_path);
    }

    public function trainingCategories(): HasMany
    {
        return $this->hasMany(TrainingCategory::class);
    }

    private function publicStorageUrl(string $path): string
    {
        $baseUrl = request()->getSchemeAndHttpHost();

        if (! $baseUrl) {
            $baseUrl = rtrim(config('app.url'), '/');
        }

        return rtrim($baseUrl, '/').'/api/storage/'.ltrim($path, '/');
    }
}
