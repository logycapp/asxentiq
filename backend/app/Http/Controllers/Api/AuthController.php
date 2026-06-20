<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales son incorrectas.'],
            ]);
        }

        if (! $user->active) {
            throw ValidationException::withMessages([
                'email' => ['El usuario está inactivo.'],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login exitoso.',
            'token' => $token,
            'user' => $user->fresh()->load('roleRelation'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()?->load('roleRelation'),
        ]);
    }

    public function menuPermissions(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $user->loadMissing('roleRelation');

        $menuItems = MenuItem::query()
            ->with(['roles:id,name,slug', 'users:id'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(static function (MenuItem $item) use ($user): array {
                $assignedRoles = $item->roles
                    ->map(static fn (Role $assignedRole): array => [
                        'id' => $assignedRole->id,
                        'name' => $assignedRole->name,
                        'slug' => $assignedRole->slug,
                    ])
                    ->values();

                return [
                    'id' => $item->id,
                    'label' => $item->label,
                    'route' => $item->route,
                    'icon' => $item->icon,
                    'order' => $item->sort_order,
                    'enabled' => $item->enabled,
                    'exact' => $item->exact,
                    'assigned_role_ids' => $assignedRoles->pluck('id')->values(),
                    'assigned_roles' => $assignedRoles,
                    'assigned_to_role' => $user->roleRelation?->id
                        ? $item->roles->contains('id', $user->roleRelation->id)
                        : false,
                    'assigned_to_user' => $item->users->contains('id', $user->id),
                ];
            })
            ->values();

        return response()->json([
            'user' => $user->load('roleRelation'),
            'menu_items' => $menuItems,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout exitoso.',
        ]);
    }

    public function sendPasswordResetLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink($data);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => ['No fue posible enviar el correo de restauracion.'],
            ]);
        }

        return response()->json([
            'message' => 'Se envio un correo de restauracion a la direccion registrada.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password): void {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();

            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => ['El enlace de restauracion no es valido o ya vencio.'],
            ]);
        }

        return response()->json([
            'message' => 'La contrasena se actualizo correctamente.',
        ]);
    }
}
