import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { MenuService } from '../services/menu.service';

function resolveProtectedRoute(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('users')) {
    return '/users';
  }

  if (path.startsWith('roles')) {
    return '/roles';
  }

  if (path.startsWith('empresas')) {
    return '/empresas';
  }

  if (path.startsWith('trainings')) {
    return '/trainings';
  }

  if (path === 'admin') {
    return '/admin';
  }

  return null;
}

function resolveProtectedRouteFromSnapshot(route: Parameters<CanActivateChildFn>[0]): string | null {
  let current: ActivatedRouteSnapshot | null = route;

  while (current) {
    const resolved = resolveProtectedRoute(current.routeConfig?.path);

    if (resolved) {
      return resolved;
    }

    current = current.parent;
  }

  return null;
}

export const moduleAccessGuard: CanActivateChildFn = (route) => {
  const loadingService = inject(LoadingService);
  const menuService = inject(MenuService);
  const router = inject(Router);
  const requiredRoute = resolveProtectedRouteFromSnapshot(route);

  if (!requiredRoute) {
    return true;
  }

  return loadingService.track(menuService.currentPermissions()).pipe(
    map((response) => {
      const allowed = response.menu_items.some((item) => item.route === requiredRoute && item.enabled);
      return allowed ? true : router.createUrlTree(['/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/dashboard'])))
  );
};
