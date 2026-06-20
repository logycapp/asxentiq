import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthUser } from './auth.service';

export interface MenuItem {
  id: number;
  label: string;
  route: string;
  icon?: string | null;
  order: number;
  exact: boolean;
  children?: MenuItem[];
}

export interface MenuRoleSummary {
  id: number;
  name: string;
  slug: string;
}

export interface MenuPermissionItem {
  id: number;
  label: string;
  route: string;
  icon?: string | null;
  order: number;
  enabled: boolean;
  exact: boolean;
  assigned_role_ids: number[];
  assigned_roles: MenuRoleSummary[];
  assigned_to_role: boolean;
  assigned_to_user: boolean;
}

export interface CurrentMenuPermissionsResponse {
  user: AuthUser;
  menu_items: MenuPermissionItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.apiUrl}/menu`);
  }

  currentPermissions(): Observable<CurrentMenuPermissionsResponse> {
    return this.http.get<CurrentMenuPermissionsResponse>(`${this.apiUrl}/me/menu-permissions`);
  }
}
