<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    private const HIDDEN_MAIN_MENU_ROUTES = ['/users', '/roles'];
    private const HIDDEN_CHILD_MENU_ROUTES = ['/trainings/participants'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([]);
        }

        $user->loadMissing('roleRelation');
        $roleId = $user->roleRelation?->id;

        $allItems = MenuItem::query()
            ->with(['roles:id,name,slug', 'users:id'])
            ->where('enabled', true)
            ->whereNotIn('route', self::HIDDEN_MAIN_MENU_ROUTES)
            ->whereNotIn('route', self::HIDDEN_CHILD_MENU_ROUTES)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $authorizedItemIds = $allItems
            ->filter(fn (MenuItem $item): bool => $this->isAuthorized($item, $user, $roleId))
            ->pluck('id');

        $visibleParentIds = $allItems
            ->filter(static fn (MenuItem $item): bool => $item->parent_id !== null)
            ->filter(fn (MenuItem $item): bool => $authorizedItemIds->contains($item->id))
            ->pluck('parent_id')
            ->filter()
            ->unique();

        $visibleItems = $allItems->filter(
            fn (MenuItem $item): bool => $authorizedItemIds->contains($item->id) || $visibleParentIds->contains($item->id)
        );

        $parentItems = $visibleItems->whereNull('parent_id');
        $childItems = $visibleItems->whereNotNull('parent_id');

        $items = $parentItems->map(static function (MenuItem $item) use ($childItems): array {
            $childrenBase = $childItems->where('parent_id', $item->id)->values()->map(static fn (MenuItem $child): array => [
                'id' => $child->id,
                'label' => $child->label,
                'route' => $child->route,
                'icon' => $child->icon,
                'order' => $child->sort_order,
                'exact' => $child->exact ?? false,
            ])->toArray();

            // En Capacitaciones solo mostramos el subitem real: Programas.
            $children = $item->route === '/trainings'
                ? $childrenBase
                : array_merge(
                    [
                        [
                            'id' => $item->id,
                            'label' => $item->label,
                            'route' => $item->route,
                            'icon' => $item->icon,
                            'order' => 0,
                            'exact' => $item->exact ?? false,
                        ],
                    ],
                    $childrenBase,
                );

            return [
                'id' => $item->id,
                'label' => $item->label,
                'route' => $item->route,
                'icon' => $item->icon,
                'order' => $item->sort_order,
                'exact' => $item->exact,
                'children' => $children,
            ];
        })->values();

        return response()->json($items);
    }

    private function isAuthorized(MenuItem $item, User $user, ?int $roleId): bool
    {
        if ($item->users->contains('id', $user->id)) {
            return true;
        }

        if ($roleId && $item->roles->contains('id', $roleId)) {
            return true;
        }

        return false;
    }
}
