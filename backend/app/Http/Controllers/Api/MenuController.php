<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    private const HIDDEN_MAIN_MENU_ROUTES = ['/users', '/roles'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([]);
        }

        $user->loadMissing('roleRelation');
        $roleId = $user->roleRelation?->id;

        $allItems = MenuItem::query()
            ->where('enabled', true)
            ->whereNotIn('route', self::HIDDEN_MAIN_MENU_ROUTES)
            ->where(function ($query) use ($roleId, $user): void {
                $query->whereHas('users', fn ($userQuery) => $userQuery->where('users.id', $user->id));

                if ($roleId) {
                    $query->orWhereHas('roles', fn ($roleQuery) => $roleQuery->where('roles.id', $roleId));
                }
            })
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $parentItems = $allItems->whereNull('parent_id');
        $childItems = $allItems->whereNotNull('parent_id');

        $items = $parentItems->map(static function (MenuItem $item) use ($childItems): array {
            $childrenBase = $childItems->where('parent_id', $item->id)->values()->map(static fn (MenuItem $child): array => [
                'id' => $child->id,
                'label' => $child->label,
                'route' => $child->route,
                'icon' => $child->icon,
                'order' => $child->sort_order,
                'exact' => $child->exact ?? false,
            ])->toArray();

            // Prepender el item padre como primer hijo para que sea clickeable
            $children = array_merge(
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
}
