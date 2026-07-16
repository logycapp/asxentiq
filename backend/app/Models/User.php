<?php

namespace App\Models;

use App\Notifications\PasswordResetNotification;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = ['role', 'profile_photo_url', 'avatar_photo_url', 'theme_mode', 'sidebar_collapsed'];

    protected $fillable = [
        'name',
        'email',
        'password',
        'active',
        'role_id',
        'role',
        'profile_photo_path',
        'avatar_photo_path',
        'menu_layout',
        'theme_mode',
        'sidebar_collapsed',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
            'role_id' => 'integer',
        ];
    }

    public function getSidebarCollapsedAttribute($value): bool
    {
        return (bool) $value;
    }

    public function getThemeModeAttribute(?string $value): string
    {
        return in_array($value, ['dark', 'light'], true) ? $value : 'dark';
    }

    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(MenuItem::class, 'user_menu_item')
            ->withTimestamps();
    }

    public function getRoleAttribute(): string
    {
        return $this->roleRelation?->slug ?? 'user';
    }

    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (! $this->profile_photo_path) {
            return null;
        }

        return Storage::disk('public')->url($this->profile_photo_path);
    }

    public function getAvatarPhotoUrlAttribute(): ?string
    {
        if (! $this->avatar_photo_path) {
            return null;
        }

        return Storage::disk('public')->url($this->avatar_photo_path);
    }

    public function getMenuLayoutAttribute($value): string
    {
        return in_array($value, ['top', 'left'], true) ? $value : 'top';
    }

    public function setRoleAttribute(mixed $value): void
    {
        if ($value === null || $value === '') {
            $this->attributes['role_id'] = null;

            return;
        }

        if (is_numeric($value)) {
            $this->attributes['role_id'] = (int) $value;

            return;
        }

        $this->attributes['role_id'] = Role::query()->where('slug', $value)->value('id');
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new PasswordResetNotification($token));
    }
}