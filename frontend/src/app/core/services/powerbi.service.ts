import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PowerbiColumn {
  key: string;
  label: string;
}

export interface PowerbiRow {
  [key: string]: string | number | boolean | null;
}

export interface PowerbiSheetPreview {
  index: number;
  name: string;
  row_count: number;
  headers: PowerbiColumn[];
  rows: PowerbiRow[];
  preview_rows: PowerbiRow[];
  numeric_columns: string[];
  text_columns: string[];
}

export interface PowerbiPreviewResponse {
  message: string;
  file: {
    original_name: string;
    mime_type: string | null;
    size_bytes: number | null;
  };
  default_sheet_index: number;
  sheets: PowerbiSheetPreview[];
}

export interface PowerbiImportResponse {
  message: string;
  rows_inserted: number;
  source_file: string;
}

export interface PowerbiDashboardFilters {
  date_from?: string | null;
  date_to?: string | null;
  department?: string | null;
  municipality?: string | null;
  causal?: string | null;
  mechanism?: string | null;
}

export interface PowerbiDashboardSummary {
  total_records: number;
  current_year_records: number;
  current_month_records: number;
  departments_count: number;
  municipalities_count: number;
  causals_count: number;
  mechanisms_count: number;
  diagnoses_count: number;
}

export interface PowerbiChartPoint {
  label: string;
  value: number;
}

export interface PowerbiDashboardRecord {
  id: number;
  source_file: string | null;
  sheet_name: string;
  source_row_number: number;
  numero_siniestro: string | null;
  no_identificacion: string | null;
  nit: string | null;
  fecha_siniestro: string | null;
  causal_evento_grave: string | null;
  municipio_ocurrencia_siniestro: string | null;
  departamento_ocurrencia_siniestro: string | null;
  cie_10_dx_1: string | null;
  nombre_dx_1: string | null;
  detalle: string | null;
  mecanismo: string | null;
}

export interface PowerbiDashboardResponse {
  message: string;
  filters: PowerbiDashboardFilters;
  summary: PowerbiDashboardSummary;
  charts: {
    monthly: PowerbiChartPoint[];
    causal: PowerbiChartPoint[];
    department: PowerbiChartPoint[];
    mechanism: PowerbiChartPoint[];
    diagnosis: PowerbiChartPoint[];
  };
  available_filters: {
    departments: string[];
    municipalities: string[];
    causals: string[];
    mechanisms: string[];
  };
  records: PowerbiDashboardRecord[];
  last_import: {
    source_file: string | null;
    rows: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PowerbiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/powerbi`;

  preview(formData: FormData): Observable<PowerbiPreviewResponse> {
    return this.http.post<PowerbiPreviewResponse>(`${this.apiUrl}/preview`, formData);
  }

  import(formData: FormData): Observable<PowerbiImportResponse> {
    return this.http.post<PowerbiImportResponse>(`${this.apiUrl}/import`, formData);
  }

  dashboard(filters: PowerbiDashboardFilters = {}): Observable<PowerbiDashboardResponse> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<PowerbiDashboardResponse>(`${this.apiUrl}/dashboard`, { params });
  }
}
