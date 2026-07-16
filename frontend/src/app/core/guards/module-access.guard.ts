import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
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

export const moduleAccessGuard: CanActivateChildFn = (route) => {
  const loadingService = inject(LoadingService);
  const menuService = inject(MenuService);
  const router = inject(Router);
  const requiredRoute = resolveProtectedRoute(route.routeConfig?.path);

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
