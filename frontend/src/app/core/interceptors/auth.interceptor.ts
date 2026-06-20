import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Use public_token for /api/public/ routes
  const isPublicTraining = req.url.includes('/api/public/trainings');
  const token = isPublicTraining
    ? localStorage.getItem('public_token')
    : authService.getToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (isPublicTraining) {
          localStorage.removeItem('public_token');
          localStorage.removeItem('public_user');
          router.navigate(['/public/trainings']);
        } else {
          authService.clearSession();
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
