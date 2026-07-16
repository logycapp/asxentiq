import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Empresa {
  id: number;
  name: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  logo_path?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmpresaPayload {
  name: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/empresas`;

  list(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.apiUrl);
  }

  get(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${id}`);
  }

  create(payload: FormData): Observable<{ message: string; empresa: Empresa }> {
    return this.http.post<{ message: string; empresa: Empresa }>(this.apiUrl, payload);
  }

  update(id: number, payload: FormData): Observable<{ message: string; empresa: Empresa }> {
    payload.set('_method', 'PUT');
    return this.http.post<{ message: string; empresa: Empresa }>(`${this.apiUrl}/${id}`, payload);
  }

  activate(id: number): Observable<{ message: string; empresa: Empresa }> {
    return this.http.patch<{ message: string; empresa: Empresa }>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<{ message: string; empresa: Empresa }> {
    return this.http.patch<{ message: string; empresa: Empresa }>(`${this.apiUrl}/${id}/deactivate`, {});
  }
}
