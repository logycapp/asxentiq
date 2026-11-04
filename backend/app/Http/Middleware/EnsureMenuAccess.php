<?php

namespace App\Http\Middleware;

use App\Models\MenuItem;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMenuAccess
{
    public function handle(Request $request, Closure $next, string $route): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $normalizedRoute = $this->normalizeRoute($route);

        $menuItem = MenuItem::query()
            ->with(['roles:id,name,slug', 'users:id', 'children.roles:id,name,slug', 'children.users:id'])
            ->where('enabled', true)
            ->where('route', $normalizedRoute)
            ->first();

        $hasAccess = $menuItem && (
            $this->isAuthorized($menuItem, $user) ||
            $menuItem->children->contains(fn (MenuItem $child): bool => $this->isAuthorized($child, $user))
        );

        if (! $hasAccess) {
            abort(403, 'No autorizado para usar este modulo.');
        }

        return $next($request);
    }

    private function normalizeRoute(string $route): string
    {
        $route = trim($route);

        return str_starts_with($route, '/') ? $route : '/'.$route;
    }

    private function isAuthorized(MenuItem $item, \App\Models\User $user): bool
    {
        $user->loadMissing('roleRelation');

        if ($item->users->contains('id', $user->id)) {
            return true;
        }

        if ($user->roleRelation?->id && $item->roles->contains('id', $user->roleRelation->id)) {
            return true;
        }

        return false;
    }
}
