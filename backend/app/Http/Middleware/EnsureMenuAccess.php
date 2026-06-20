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

        $user->loadMissing('roleRelation');

        $hasAccess = MenuItem::query()
            ->where('enabled', true)
            ->where('route', $normalizedRoute)
            ->where(function ($query) use ($user): void {
                $query->whereHas('users', fn ($userQuery) => $userQuery->where('users.id', $user->id));

                if ($user->roleRelation?->id) {
                    $query->orWhereHas('roles', fn ($roleQuery) => $roleQuery->where('roles.id', $user->roleRelation->id));
                }
            })
            ->exists();

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
}
