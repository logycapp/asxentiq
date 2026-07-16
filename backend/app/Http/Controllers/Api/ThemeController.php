<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ThemeController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        $rules = [];

        if ($request->has('theme_mode')) {
            $rules['theme_mode'] = ['required', Rule::in(['dark', 'light'])];
        }

        if ($request->has('sidebar_collapsed')) {
            $rules['sidebar_collapsed'] = ['required', 'boolean'];
        }

        $data = $request->validate($rules);

        $user->update($data);

        return response()->json([
            'message' => 'Configuracion actualizada correctamente.',
            'user' => $user->fresh()->load('roleRelation'),
        ]);
    }
}