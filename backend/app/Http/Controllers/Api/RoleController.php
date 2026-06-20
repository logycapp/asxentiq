<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()->orderBy('name')->get();

        return response()->json($roles);
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json($role);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $slug = $this->resolveSlug($data['name'], null, $data['slug'] ?? null);

        $role = Role::query()->create([
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'is_system' => $data['is_system'] ?? false,
        ]);

        return response()->json([
            'message' => 'Rol creado correctamente.',
            'role' => $role,
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $data = $this->validatePayload($request, $role);
        $newSlug = $this->resolveSlug($data['name'], $role, $data['slug'] ?? null);

        DB::transaction(function () use ($role, $data, $newSlug): void {
            $role->update([
                'name' => $data['name'],
                'slug' => $newSlug,
                'description' => $data['description'] ?? null,
                'is_system' => $data['is_system'] ?? $role->is_system,
            ]);
        });

        return response()->json([
            'message' => 'Rol actualizado correctamente.',
            'role' => $role->fresh(),
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->is_system) {
            return response()->json([
                'message' => 'No se puede eliminar un rol del sistema.',
            ], 422);
        }

        $usersCount = User::query()->where('role_id', $role->id)->count();
        $menuItemsCount = $role->menuItems()->count();

        if ($usersCount > 0 || $menuItemsCount > 0) {
            return response()->json([
                'message' => 'No se puede eliminar un rol que todavía está en uso.',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Rol eliminado correctamente.',
        ]);
    }

    public function menuPermissions(Role $role): JsonResponse
    {
        $menuItems = MenuItem::query()
            ->with('roles:id,name,slug')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(static function (MenuItem $item) use ($role): array {
                $assignedRoles = $item->roles
                    ->map(static fn(Role $assignedRole): array => [
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
                    'assigned_to_role' => $item->roles->contains('id', $role->id),
                ];
            })
            ->values();

        return response()->json([
            'role' => $role,
            'menu_items' => $menuItems,
        ]);
    }

    public function updateMenuPermissions(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'menu_item_ids' => ['array'],
            'menu_item_ids.*' => ['integer', 'distinct', 'exists:menu_items,id'],
        ]);

        $menuItemIds = collect($data['menu_item_ids'] ?? [])
            ->map(static fn($id) => (int) $id)
            ->unique()
            ->values();

        DB::transaction(function () use ($role, $menuItemIds): void {
            $role->menuItems()->sync($menuItemIds->all());
        });

        return response()->json([
            'message' => 'Permisos del menu actualizados correctamente.',
        ]);
    }

    private function validatePayload(Request $request, ?Role $role = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('roles', 'slug')->ignore($role?->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'is_system' => ['sometimes', 'boolean'],
        ]);
    }

    private function resolveSlug(string $name, ?Role $role, ?string $providedSlug): string
    {
        $baseSlug = $providedSlug !== null && $providedSlug !== ''
            ? Str::slug($providedSlug)
            : Str::slug($name);

        $slug = $baseSlug;
        $counter = 2;

        while (
            Role::query()
            ->where('slug', $slug)
            ->when($role, fn($query) => $query->where('id', '!=', $role->id))
            ->exists()
        ) {
            $slug = sprintf('%s-%d', $baseSlug, $counter);
            $counter++;
        }

        return $slug;
    }
}
