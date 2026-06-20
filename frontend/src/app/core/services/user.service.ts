import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  active: boolean;
  role?: string;
}

export interface UserRoleSummary {
  id: number;
  name: string;
  slug: string;
}

export interface UserMenuPermissionItem {
  id: number;
  label: string;
  route: string;
  icon?: string | null;
  order: number;
  enabled: boolean;
  exact: boolean;
  assigned_role_ids: number[];
  assigned_roles: UserRoleSummary[];
  assigned_to_role: boolean;
  assigned_to_user: boolean;
}

export interface UserMenuPermissionsResponse {
  user: User & { role_relation?: UserRoleSummary | null };
  menu_items: UserMenuPermissionItem[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  create(payload: UserPayload): Observable<{ message: string; user: User }> {
    return this.http.post<{ message: string; user: User }>(this.apiUrl, payload);
  }

  update(id: number, payload: UserPayload): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/${id}`, payload);
  }

  activate(id: number): Observable<{ message: string; user: User }> {
    return this.http.patch<{ message: string; user: User }>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<{ message: string; user: User }> {
    return this.http.patch<{ message: string; user: User }>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  menuPermissions(id: number): Observable<UserMenuPermissionsResponse> {
    return this.http.get<UserMenuPermissionsResponse>(`${this.apiUrl}/${id}/menu-permissions`);
  }

  updateMenuPermissions(id: number, menuItemIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/menu-permissions`, {
      menu_item_ids: menuItemIds
    });
  }
}
