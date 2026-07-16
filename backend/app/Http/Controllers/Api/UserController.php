<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $empresaId = request()->integer('empresa_id');

        $users = User::query()
            ->with(['roleRelation', 'empresaRelation'])
            ->when($empresaId, fn ($query) => $query->where('empresa_id', $empresaId))
            ->orderBy('id')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'string', 'max:255', Rule::exists('roles', 'slug')],
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'active' => $data['active'] ?? true,
            'role' => $data['role'] ?? 'user',
            'empresa_id' => $data['empresa_id'],
        ]);

        return response()->json([
            'message' => 'Usuario creado correctamente.',
            'user' => $user,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['roleRelation', 'empresaRelation']);

        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'active' => ['required', 'boolean'],
            'role' => ['sometimes', 'string', 'max:255', Rule::exists('roles', 'slug')],
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
        ]);

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'active' => $data['active'],
            'role' => $data['role'] ?? $user->role ?? 'user',
            'empresa_id' => $data['empresa_id'],
        ];

        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
        }

        $user->update($payload);

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'user' => $user->fresh()->load(['roleRelation', 'empresaRelation']),
        ]);
    }

    public function activate(User $user): JsonResponse
    {
        $user->update(['active' => true]);

        return response()->json([
            'message' => 'Usuario activado correctamente.',
            'user' => $user->fresh()->load(['roleRelation', 'empresaRelation']),
        ]);
    }

    public function deactivate(User $user): JsonResponse
    {
        $user->update(['active' => false]);
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Usuario inactivado correctamente.',
            'user' => $user->fresh()->load(['roleRelation', 'empresaRelation']),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Usuario eliminado correctamente.',
        ]);
    }

    public function menuPermissions(User $user): JsonResponse
    {
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

    public function updateMenuPermissions(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'menu_item_ids' => ['array'],
            'menu_item_ids.*' => ['integer', 'distinct', 'exists:menu_items,id'],
        ]);

        $menuItemIds = collect($data['menu_item_ids'] ?? [])
            ->map(static fn ($id) => (int) $id)
            ->unique()
            ->values();

        DB::transaction(function () use ($user, $menuItemIds): void {
            $user->menuItems()->sync($menuItemIds->all());
        });

        return response()->json([
            'message' => 'Permisos del menu del usuario actualizados correctamente.',
        ]);
    }
}
