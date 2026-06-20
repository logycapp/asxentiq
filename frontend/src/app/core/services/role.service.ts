import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RolePayload {
  name: string;
  slug?: string;
  description?: string | null;
  is_system: boolean;
}

export interface RoleMenuItem {
  id: number;
  label: string;
  route: string;
  icon?: string | null;
  order: number;
  enabled: boolean;
  exact: boolean;
  assigned_role_ids: number[];
  assigned_roles: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  assigned_to_role: boolean;
}

export interface RoleMenuPermissionsResponse {
  role: Role;
  menu_items: RoleMenuItem[];
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/roles`;

  list(): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl);
  }

  get(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${id}`);
  }

  create(payload: RolePayload): Observable<{ message: string; role: Role }> {
    return this.http.post<{ message: string; role: Role }>(this.apiUrl, payload);
  }

  update(id: number, payload: RolePayload): Observable<{ message: string; role: Role }> {
    return this.http.put<{ message: string; role: Role }>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  menuPermissions(id: number): Observable<RoleMenuPermissionsResponse> {
    return this.http.get<RoleMenuPermissionsResponse>(`${this.apiUrl}/${id}/menu-permissions`);
  }

  updateMenuPermissions(id: number, menuItemIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/menu-permissions`, {
      menu_item_ids: menuItemIds
    });
  }
}
