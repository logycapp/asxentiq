import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PowerbiColumn {
  key: string;
  label: string;
  type: 'string' | 'numeric' | 'date';
}

export interface PowerbiRow {
  [key: string]: string | number | boolean | null;
}

export interface PowerbiEmpresa {
  id: number;
  name: string;
}

export interface PowerbiProject {
  id: number;
  empresa_id: number | null;
  name: string;
  description: string | null;
  status: 'draft' | 'published';
  public_token: string | null;
  handler: string | null;
  created_at?: string;
  updated_at?: string;
  datasets_count?: number;
  visualizations_count?: number;
  empresa?: PowerbiEmpresa | null;
  datasets?: PowerbiDataset[];
  visualizations?: PowerbiVisualization[];
}

export interface PowerbiProjectPayload {
  empresa_id: number | null;
  name: string;
  description: string;
  handler: string;
}

export interface PowerbiDataset {
  id: number;
  project_id: number;
  source_file: string;
  row_count: number;
  columns: PowerbiColumn[];
  delimiter: string | null;
  encoding: string | null;
  imported_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PowerbiVisualizationConfig {
  label_column: string | null;
  value_column: string | null;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  date_grouping: 'day' | 'month' | 'year' | null;
}

export interface PowerbiVisualization {
  id: number;
  project_id: number;
  dataset_id: number | null;
  title: string;
  chart_type: 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table';
  config: PowerbiVisualizationConfig;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PowerbiVisualizationPayload {
  dataset_id: number;
  title: string;
  chart_type: string;
  config: PowerbiVisualizationConfig;
}

export interface PowerbiChartPoint {
  label: string;
  value: number;
}

export interface PowerbiVisualizationResult {
  id: number;
  title: string;
  chart_type: string;
  config: PowerbiVisualizationConfig;
  points: PowerbiChartPoint[];
  kpi: number | null;
}

export interface PowerbiFilterOption {
  type: 'date' | 'string';
  label: string;
  values?: string[];
  min?: string;
  max?: string;
}

export interface PowerbiDashboardResponse {
  message: string;
  project: { id: number; name: string };
  datasets: Array<{ id: number; source_file: string; row_count: number }>;
  dataset: {
    id: number;
    source_file: string;
    row_count: number;
    columns: PowerbiColumn[];
  } | null;
  visualizations: PowerbiVisualizationResult[];
  sst_indicators: PowerbiSstIndicators | null;
  filter_options: Record<string, PowerbiFilterOption>;
  row_count: number;
}

export interface PowerbiSstMonthlyIndicator {
  month: string;
  workers: number;
  scheduled_days_estimated: number;
  accidents: number;
  incapacity_days_recorded: number;
  fatal_accidents: number;
  medical_absence_days: number;
  medical_absenteeism_percentage: number;
}

export interface PowerbiSstIndicators {
  monthly: PowerbiSstMonthlyIndicator[];
  medical_absenteeism: {
    absence_days: number;
    scheduled_days_estimated: number;
    percentage: number;
    by_month: Array<{ month: string; absence_days: number; scheduled_days_estimated: number; percentage: number }>;
  } | null;
  fatal_accidents_identified: boolean;
  fatal_accidents_total: number;
  fatal_accidents_by_month: PowerbiChartPoint[];
  notes: Record<string, string>;
}

export interface PowerbiPreviewSheet {
  name: string | null;
  columns: PowerbiColumn[];
  row_count: number;
  preview_rows: PowerbiRow[];
}

export interface PowerbiPreviewResponse {
  message: string;
  format?: 'csv' | 'excel';
  file: {
    original_name: string;
    mime_type: string | null;
    size_bytes: number | null;
  };
  delimiter: string;
  encoding: string;
  columns: PowerbiColumn[];
  row_count: number;
  preview_rows: PowerbiRow[];
  sheets?: PowerbiPreviewSheet[];
}

export interface PowerbiImportResponse {
  message: string;
  rows_inserted: number;
  source_file: string;
  dataset: PowerbiDataset;
  datasets?: PowerbiDataset[];
  columns: PowerbiColumn[];
  preview_rows: PowerbiRow[];
  delimiter: string;
  encoding: string;
}

export interface PowerbiPublicDataset {
  id: number;
  source_file: string;
  row_count: number;
  filtered_row_count?: number;
  visualizations: PowerbiVisualizationResult[];
}

export interface PowerbiPublicResponse {
  message: string;
  project: {
    id: number;
    name: string;
    description: string | null;
    updated_at: string | null;
  };
  empresa: { id: number; name: string; logo_url: string | null } | null;
  filter_options: Record<string, PowerbiFilterOption>;
  row_count: number;
  sst_indicators: PowerbiSstIndicators | null;
  datasets: PowerbiPublicDataset[];
}

export interface PowerbiFilters {
  [key: string]: string | { from?: string; to?: string };
}

@Injectable({ providedIn: 'root' })
export class PowerbiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/powerbi`;

  listTransformers(): Observable<{ transformers: string[] }> {
    return this.http.get<{ transformers: string[] }>(`${this.apiUrl}/transformers`);
  }

  listProjects(): Observable<PowerbiProject[]> {
    return this.http.get<PowerbiProject[]>(`${this.apiUrl}/projects`);
  }

  getProject(id: number): Observable<PowerbiProject> {
    return this.http.get<PowerbiProject>(`${this.apiUrl}/projects/${id}`);
  }

  createProject(payload: PowerbiProjectPayload): Observable<{ message: string; project: PowerbiProject }> {
    return this.http.post<{ message: string; project: PowerbiProject }>(`${this.apiUrl}/projects`, payload);
  }

  updateProject(id: number, payload: PowerbiProjectPayload): Observable<{ message: string; project: PowerbiProject }> {
    return this.http.put<{ message: string; project: PowerbiProject }>(`${this.apiUrl}/projects/${id}`, payload);
  }

  deleteProject(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/projects/${id}`);
  }

  publishProject(id: number): Observable<{ message: string; project: PowerbiProject }> {
    return this.http.post<{ message: string; project: PowerbiProject }>(`${this.apiUrl}/projects/${id}/publish`, {});
  }

  unpublishProject(id: number): Observable<{ message: string; project: PowerbiProject }> {
    return this.http.post<{ message: string; project: PowerbiProject }>(`${this.apiUrl}/projects/${id}/unpublish`, {});
  }

  regenerateToken(id: number): Observable<{ message: string; project: PowerbiProject }> {
    return this.http.post<{ message: string; project: PowerbiProject }>(`${this.apiUrl}/projects/${id}/regenerate-token`, {});
  }

  previewCsv(projectId: number, formData: FormData): Observable<PowerbiPreviewResponse> {
    return this.http.post<PowerbiPreviewResponse>(`${this.apiUrl}/projects/${projectId}/datasets/preview`, formData);
  }

  importDataset(projectId: number, formData: FormData): Observable<PowerbiImportResponse> {
    return this.http.post<PowerbiImportResponse>(`${this.apiUrl}/projects/${projectId}/datasets`, formData);
  }

  listDatasets(projectId: number): Observable<PowerbiDataset[]> {
    return this.http.get<PowerbiDataset[]>(`${this.apiUrl}/projects/${projectId}/datasets`);
  }

  deleteDataset(datasetId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/datasets/${datasetId}`);
  }

  listVisualizations(projectId: number): Observable<PowerbiVisualization[]> {
    return this.http.get<PowerbiVisualization[]>(`${this.apiUrl}/projects/${projectId}/visualizations`);
  }

  createVisualization(projectId: number, payload: PowerbiVisualizationPayload): Observable<{ message: string; visualization: PowerbiVisualization }> {
    return this.http.post<{ message: string; visualization: PowerbiVisualization }>(`${this.apiUrl}/projects/${projectId}/visualizations`, payload);
  }

  updateVisualization(visualizationId: number, payload: PowerbiVisualizationPayload): Observable<{ message: string; visualization: PowerbiVisualization }> {
    return this.http.put<{ message: string; visualization: PowerbiVisualization }>(`${this.apiUrl}/visualizations/${visualizationId}`, payload);
  }

  deleteVisualization(visualizationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/visualizations/${visualizationId}`);
  }

  getDashboard(projectId: number, datasetId?: number | null, filters: PowerbiFilters = {}): Observable<PowerbiDashboardResponse> {
    let params = new HttpParams();

    if (datasetId) {
      params = params.set('dataset_id', String(datasetId));
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      if (typeof value === 'string') {
        params = params.set(`filters[${key}]`, value);
        continue;
      }

      if (value.from) {
        params = params.set(`filters[${key}][from]`, value.from);
      }

      if (value.to) {
        params = params.set(`filters[${key}][to]`, value.to);
      }
    }

    return this.http.get<PowerbiDashboardResponse>(`${this.apiUrl}/projects/${projectId}/dashboard`, { params });
  }

  getPublicDashboard(token: string, datasetId?: number | null, filters: PowerbiFilters = {}): Observable<PowerbiPublicResponse> {
    let params = new HttpParams();

    if (datasetId) {
      params = params.set('dataset_id', String(datasetId));
    }

    for (const [key, value] of Object.entries(filters)) {
      if (!value) {
        continue;
      }

      if (typeof value === 'string') {
        params = params.set(`filters[${key}]`, value);
        continue;
      }

      if (value.from) {
        params = params.set(`filters[${key}][from]`, value.from);
      }

      if (value.to) {
        params = params.set(`filters[${key}][to]`, value.to);
      }
    }

    return this.http.get<PowerbiPublicResponse>(`${environment.apiUrl}/public/powerbi/${encodeURIComponent(token)}`, { params });
  }
}
