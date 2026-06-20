<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GeminiAvatarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()?->load('roleRelation'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'menu_layout' => ['required', Rule::in(['top', 'left'])],
            'photo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:4096'],
        ]);

        $photoPath = $user->profile_photo_path;
        $avatarPath = $user->avatar_photo_path;

        if ($request->hasFile('photo')) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }

            if ($avatarPath) {
                Storage::disk('public')->delete($avatarPath);
            }

            $photoPath = $request->file('photo')->store('profile-photos', 'public');
            $avatarPath = null;
        }

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'menu_layout' => $data['menu_layout'],
            'profile_photo_path' => $photoPath,
            'avatar_photo_path' => $avatarPath,
        ]);

        return response()->json([
            'message' => 'Perfil actualizado correctamente.',
            'user' => $user->fresh()->load('roleRelation'),
        ]);
    }

    public function generateAvatar(Request $request, GeminiAvatarService $avatarService): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        if (! $user->profile_photo_path) {
            return response()->json([
                'message' => 'Primero debes guardar una fotografia original.',
            ], 422);
        }

        $avatarPath = $avatarService->generateFromPhoto($user->profile_photo_path);

        if (! $avatarPath) {
            return response()->json([
                'message' => 'No fue posible generar el avatar.',
            ], 422);
        }

        $oldAvatarPath = $user->avatar_photo_path;

        $user->update([
            'avatar_photo_path' => $avatarPath,
        ]);

        if ($oldAvatarPath && $oldAvatarPath !== $avatarPath) {
            Storage::disk('public')->delete($oldAvatarPath);
        }

        return response()->json([
            'message' => 'Avatar generado correctamente.',
            'user' => $user->fresh()->load('roleRelation'),
        ]);
    }
}
