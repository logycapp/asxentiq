import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  profile_photo_url?: string | null;
  avatar_photo_url?: string | null;
  menu_layout?: 'top' | 'left' | string | null;
  theme_mode?: 'dark' | 'light';
  sidebar_collapsed?: boolean | number;
  role_relation?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

interface MessageResponse {
  message: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly tokenKey = 'asxentiq_token';
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(this.readUser());

  readonly user$ = this.userSubject.asObservable();

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem('asxentiq_user', JSON.stringify(response.user));
        this.userSubject.next(response.user);
      })
    );
  }

  requestPasswordReset(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(payload: PasswordResetPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, payload);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  me(): Observable<{ user: AuthUser }> {
    return this.http.get<{ user: AuthUser }>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        localStorage.setItem('asxentiq_user', JSON.stringify(response.user));
        this.userSubject.next(response.user);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  getCurrentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('asxentiq_user');
    this.userSubject.next(null);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem('asxentiq_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
