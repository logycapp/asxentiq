import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Select3Component, Select3Option } from '../../shared/select3.component';
import {
  PowerbiColumn,
  PowerbiDashboardResponse,
  PowerbiDataset,
  PowerbiFilters,
  PowerbiPreviewResponse,
  PowerbiProject,
  PowerbiService,
  PowerbiVisualizationConfig,
  PowerbiVisualizationResult
} from '../../core/services/powerbi.service';
import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';
import { PowerbiChartComponent } from './powerbi-chart.component';

type FilterOptionEntry = { key: string; option: { type: string; label: string; values?: string[]; min?: string; max?: string } };

const CHART_TYPES: Array<{ value: string; label: string }> = [
  { value: 'pie', label: 'Torta' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Línea' },
  { value: 'area', label: 'Gradient Stacked Area Chart' }
];

const AGGREGATIONS: Array<{ value: string; label: string }> = [
  { value: 'count', label: 'Conteo' },
  { value: 'sum', label: 'Suma' },
  { value: 'avg', label: 'Promedio' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' }
];

const DATE_GROUPINGS: Array<{ value: string; label: string }> = [
  { value: 'day', label: 'Por día' },
  { value: 'month', label: 'Por mes' },
  { value: 'year', label: 'Por año' }
];

const VISIBLE_FILTER_KEYS = [
  'causal_evento_grave',
  'fecha_siniestro',
  'municipio_ocurrencia_siniestro',
  'departamento_ocurrencia_siniestro',
  'mecanismo'
];

@Component({
  selector: 'app-powerbi-project-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent, PowerbiChartComponent, Select3Component],
  templateUrl: './powerbi-project-detail.component.html',
  styleUrls: [],
  styles: [`
    :host {
      display: block;
    }

    :host .powerbi-status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 5.5rem;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    :host .powerbi-status-published {
      background: rgba(34, 197, 94, 0.14);
      border-color: rgba(34, 197, 94, 0.32);
      color: #15803d;
    }

    :host .powerbi-status-draft {
      background: rgba(245, 158, 11, 0.14);
      border-color: rgba(245, 158, 11, 0.32);
      color: #b45309;
    }

    :host .powerbi-column-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      background: rgba(4, 87, 191, 0.08);
      border: 1px solid rgba(4, 87, 191, 0.16);
      color: #0457bf;
    }

    :host .powerbi-column-chip .material-symbols-outlined {
      font-size: 0.9rem;
    }

    :host .powerbi-tab-btn {
      appearance: none;
      border: 0;
      border-radius: 0.75rem;
      padding: 0.7rem 1.1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
      background: transparent;
      font-weight: 700;
      transition: background 160ms ease, color 160ms ease;
    }

    :host .powerbi-tab-btn:hover {
      color: #132238;
    }

    :host .powerbi-tab-btn.is-active {
      background: rgba(4, 87, 191, 0.1);
      color: #0457bf;
    }

    :host .powerbi-viz-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: #ffffff;
      border-radius: 1rem;
      overflow: hidden;
    }

    :host .powerbi-filter-card {
      background: linear-gradient(155deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92));
      border: 1px solid rgba(37, 99, 235, 0.14) !important;
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
    }

    :host .powerbi-filter-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    :host .powerbi-filter-icon {
      display: inline-grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.75rem;
      color: #2563eb;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(6, 182, 212, 0.12));
    }

    :host .powerbi-filter-count {
      padding: 0.35rem 0.6rem;
      border-radius: 999px;
      color: #1d4ed8;
      background: rgba(37, 99, 235, 0.1);
      font-size: 0.7rem;
      font-weight: 800;
      white-space: nowrap;
    }

    :host .powerbi-filter-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.7rem 0.8rem;
      border-radius: 0.75rem;
      color: #475569;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
      font-size: 0.78rem;
      font-weight: 600;
    }

    :host .powerbi-filter-summary .material-symbols-outlined {
      color: #0ea5e9;
      font-size: 1.1rem;
    }

    :host .powerbi-filter-fields {
      padding: 0.9rem;
      border-radius: 0.9rem;
      background: rgba(248, 250, 252, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }

    :host .powerbi-filter-field > label {
      color: #475569;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    :host .powerbi-filter-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
      padding-top: 0.35rem;
    }

    :host .powerbi-filter-actions .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }
  `]
})
export class PowerbiProjectDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly powerbiService = inject(PowerbiService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);

  readonly chartTypes = CHART_TYPES;
  readonly aggregations = AGGREGATIONS;
  readonly dateGroupings = DATE_GROUPINGS;

  project: PowerbiProject | null = null;
  dashboard: PowerbiDashboardResponse | null = null;
  loading = true;
  message = '';
  errorMessage = '';

  activeTab: 'datos' | 'visualizaciones' | 'compartir' = 'datos';
  activeDatasetId: number | null = null;
  filters: PowerbiFilters = {};
  filterModels: Record<string, string> = {};

  selectedFile: File | null = null;
  preview: PowerbiPreviewResponse | null = null;
  previewLoading = false;
  importing = false;
  uploadError = '';

  vizModalMode: 'create' | 'edit' | null = null;
  vizModalSaving = false;
  vizModalError = '';
  editingVisualizationId: number | null = null;

  readonly vizForm = this.fb.group({
    dataset_id: ['' as string | number, [Validators.required]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    chart_type: ['bar', [Validators.required]],
    label_column: [''],
    value_column: [''],
    aggregation: ['count'],
    date_grouping: ['']
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'No fue posible determinar el proyecto.';
      this.loading = false;
      return;
    }

    this.loadProject(id);
  }

  get filterOptions(): FilterOptionEntry[] {
    return this.cachedFilterOptions;
  }

  get activeFilterCount(): number {
    return Object.values(this.filters).filter((value) => {
      if (typeof value === 'string') {
        return value !== '';
      }

      return Boolean(value?.from || value?.to);
    }).length;
  }

  private cachedFilterOptions: FilterOptionEntry[] = [];
  private cachedStringFilterOptions: Record<string, Select3Option[]> = {};

  get publicUrl(): string {
    if (!this.project?.public_token) {
      return '';
    }

    return `${window.location.origin}/public/powerbi/${this.project.public_token}`;
  }

  get isPublished(): boolean {
    return this.project?.status === 'published';
  }

  loadProject(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.powerbiService.getProject(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (project) => {
          this.project = project;

          if (!this.activeDatasetId && project.datasets?.length) {
            this.activeDatasetId = project.datasets[0].id;
          }

          this.loadDashboard();
        },
        error: () => (this.errorMessage = 'No fue posible cargar el proyecto.')
      });
  }

  loadDashboard(): void {
    if (!this.project) {
      return;
    }

    this.loadingService.track(this.powerbiService.getDashboard(this.project.id, this.activeDatasetId, this.filters)).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;

        if (!this.activeDatasetId && dashboard.dataset) {
          this.activeDatasetId = dashboard.dataset.id;
        }

        this.rebuildFilterCaches();
        this.syncFilterModels();
      },
      error: () => (this.errorMessage = 'No fue posible cargar el dashboard.')
    });
  }

  selectDataset(datasetId: number): void {
    if (this.activeDatasetId === datasetId) {
      return;
    }

    this.activeDatasetId = datasetId;
    this.filters = {};
    this.filterModels = {};
    this.loadDashboard();
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  resetFilters(): void {
    this.filters = {};
    this.filterModels = {};
    this.loadDashboard();
  }

  setStringFilter(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (value === '') {
      delete this.filters[key];
    } else {
      this.filters[key] = value;
    }
  }

  onFilterModelChange(key: string, value: string | null): void {
    if (!value) {
      delete this.filters[key];
      delete this.filterModels[key];
    } else {
      this.filters[key] = value;
      this.filterModels[key] = value;
    }
  }

  syncFilterModels(): void {
    this.filterModels = {};

    for (const [key, value] of Object.entries(this.filters)) {
      if (typeof value === 'string') {
        this.filterModels[key] = value;
      }
    }
  }

  setDateFilter(key: string, bound: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = (this.filters[key] as { from?: string; to?: string }) ?? {};

    current[bound] = value;

    if (!current.from && !current.to) {
      delete this.filters[key];
    } else {
      this.filters[key] = current;
    }
  }

  filterValue(key: string): string {
    const value = this.filters[key];
    return typeof value === 'string' ? value : '';
  }

  filterDateValue(key: string, bound: 'from' | 'to'): string {
    const value = this.filters[key];
    return typeof value === 'object' ? (value[bound] ?? '') : '';
  }

  stringFilterOptionsFor(key: string): Select3Option[] {
    return this.cachedStringFilterOptions[key] ?? [];
  }

  private rebuildFilterCaches(): void {
    const options = this.dashboard?.filter_options ?? {};
    const entries: FilterOptionEntry[] = [];
    const stringOptions: Record<string, Select3Option[]> = {};

    for (const [key, option] of Object.entries(options)) {
      if (!VISIBLE_FILTER_KEYS.includes(key)) {
        continue;
      }

      entries.push({ key, option });

      if (option.type === 'string' && option.values) {
        stringOptions[key] = option.values.map((value) => ({ value, label: value }));
      }
    }

    entries.sort((left, right) => VISIBLE_FILTER_KEYS.indexOf(left.key) - VISIBLE_FILTER_KEYS.indexOf(right.key));
    this.cachedFilterOptions = entries;
    this.cachedStringFilterOptions = stringOptions;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedFile = file;
    this.preview = null;
    this.uploadError = '';

    if (file) {
      this.runPreview(file);
    }

    input.value = '';
  }

  runPreview(file: File): void {
    if (!this.project) {
      return;
    }

    const payload = new FormData();
    payload.append('file', file);

    this.previewLoading = true;
    this.uploadError = '';

    this.loadingService.track(this.powerbiService.previewCsv(this.project.id, payload))
      .pipe(finalize(() => (this.previewLoading = false)))
      .subscribe({
        next: (response) => {
          this.preview = response;
        },
        error: (error) => {
          this.preview = null;
          this.selectedFile = null;
          this.uploadError = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible procesar el archivo CSV.';
        }
      });
  }

  confirmImport(): void {
    if (!this.project || !this.selectedFile) {
      return;
    }

    const payload = new FormData();
    payload.append('file', this.selectedFile);

    this.importing = true;
    this.uploadError = '';

    this.loadingService.track(this.powerbiService.importDataset(this.project.id, payload))
      .pipe(finalize(() => (this.importing = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.preview = null;
          this.selectedFile = null;
          this.loadProject(this.project!.id);
        },
        error: (error) => {
          this.uploadError = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar la información del CSV.';
        }
      });
  }

  cancelPreview(): void {
    this.preview = null;
    this.selectedFile = null;
    this.uploadError = '';
  }

  deleteDataset(dataset: PowerbiDataset): void {
    const confirmed = window.confirm(`¿Deseas eliminar el dataset "${dataset.source_file}"? Se eliminarán sus filas y visualizaciones.`);

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.powerbiService.deleteDataset(dataset.id)).subscribe({
      next: (response) => {
        this.message = response.message;

        if (this.activeDatasetId === dataset.id) {
          this.activeDatasetId = null;
        }

        this.loadProject(this.project!.id);
      },
      error: () => (this.errorMessage = 'No fue posible eliminar el dataset.')
    });
  }

  openCreateVizModal(): void {
    this.vizModalMode = 'create';
    this.editingVisualizationId = null;
    this.vizModalError = '';
    this.vizModalSaving = false;

    const datasetId = this.activeDatasetId ?? this.project?.datasets?.[0]?.id ?? '';

    this.vizForm.reset({
      dataset_id: datasetId,
      title: '',
      chart_type: 'bar',
      label_column: '',
      value_column: '',
      aggregation: 'count',
      date_grouping: ''
    });
  }

  openEditVizModal(visualization: PowerbiVisualizationResult): void {
    const full = this.project?.visualizations?.find((item) => item.id === visualization.id);

    this.vizModalMode = 'edit';
    this.editingVisualizationId = visualization.id;
    this.vizModalError = '';
    this.vizModalSaving = false;

    this.vizForm.reset({
      dataset_id: full?.dataset_id ?? this.activeDatasetId ?? '',
      title: visualization.title,
      chart_type: visualization.chart_type,
      label_column: visualization.config?.label_column ?? '',
      value_column: visualization.config?.value_column ?? '',
      aggregation: visualization.config?.aggregation ?? 'count',
      date_grouping: visualization.config?.date_grouping ?? ''
    });
  }

  saveVizModal(): void {
    if (!this.project) {
      return;
    }

    if (this.vizForm.invalid) {
      this.vizForm.markAllAsTouched();
      return;
    }

    const raw = this.vizForm.getRawValue();
    const datasetId = Number(raw.dataset_id);
    const labelColumn = raw.label_column || null;
    const valueColumn = raw.value_column || null;
    const isKpi = raw.chart_type === 'kpi';
    const payload = {
      dataset_id: datasetId,
      title: raw.title?.trim() ?? '',
      chart_type: raw.chart_type ?? 'bar',
      config: {
        label_column: isKpi ? null : labelColumn,
        value_column: valueColumn,
        aggregation: (raw.aggregation ?? 'count') as PowerbiVisualizationConfig['aggregation'],
        date_grouping: (raw.date_grouping || null) as PowerbiVisualizationConfig['date_grouping']
      }
    };

    const request = this.vizModalMode === 'edit' && this.editingVisualizationId
      ? this.powerbiService.updateVisualization(this.editingVisualizationId, payload)
      : this.powerbiService.createVisualization(this.project.id, payload);

    this.vizModalSaving = true;
    this.vizModalError = '';

    this.loadingService.track(request)
      .pipe(finalize(() => (this.vizModalSaving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.vizModalMode = null;
          this.editingVisualizationId = null;
          this.loadProject(this.project!.id);
          this.loadDashboard();
        },
        error: (error) => {
          this.vizModalError = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar la visualización.';
        }
      });
  }

  closeVizModal(): void {
    if (this.vizModalSaving) {
      return;
    }

    this.vizModalMode = null;
    this.editingVisualizationId = null;
    this.vizModalError = '';
  }

  deleteVisualization(visualization: PowerbiVisualizationResult): void {
    const confirmed = window.confirm(`¿Deseas eliminar la visualización "${visualization.title}"?`);

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.powerbiService.deleteVisualization(visualization.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadProject(this.project!.id);
        this.loadDashboard();
      },
      error: () => (this.errorMessage = 'No fue posible eliminar la visualización.')
    });
  }

  publishProject(): void {
    if (!this.project) {
      return;
    }

    this.loadingService.track(this.powerbiService.publishProject(this.project.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.project = response.project;
      },
      error: () => (this.errorMessage = 'No fue posible publicar el proyecto.')
    });
  }

  unpublishProject(): void {
    if (!this.project) {
      return;
    }

    this.loadingService.track(this.powerbiService.unpublishProject(this.project.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.project = response.project;
      },
      error: () => (this.errorMessage = 'No fue posible despublicar el proyecto.')
    });
  }

  regenerateToken(): void {
    if (!this.project) {
      return;
    }

    const confirmed = window.confirm('¿Deseas regenerar el enlace público? La URL anterior dejará de funcionar.');

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.powerbiService.regenerateToken(this.project.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.project = response.project;
      },
      error: () => (this.errorMessage = 'No fue posible regenerar el enlace público.')
    });
  }

  copyPublicUrl(): void {
    const url = this.publicUrl;

    if (!url) {
      return;
    }

    void navigator.clipboard.writeText(url).then(() => {
      this.message = 'Enlace público copiado al portapapeles.';
    }).catch(() => {
      this.errorMessage = 'No fue posible copiar el enlace.';
    });
  }

  selectPublicUrl(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  vizColumnsFor(datasetId: string | number | null): PowerbiColumn[] {
    return this.project?.datasets?.find((dataset) => dataset.id === Number(datasetId))?.columns ?? [];
  }

  vizLabelColumnOptions(): PowerbiColumn[] {
    return this.vizColumnsFor(this.vizForm.getRawValue().dataset_id).filter((column) =>
      column.type === 'string' || column.type === 'date'
    );
  }

  vizValueColumnOptions(): PowerbiColumn[] {
    return this.vizColumnsFor(this.vizForm.getRawValue().dataset_id).filter((column) =>
      column.type === 'numeric'
    );
  }

  get vizLabelColumnType(): string | null {
    const labelColumn = this.vizForm.getRawValue().label_column;
    return this.vizColumnsFor(this.vizForm.getRawValue().dataset_id).find((column) => column.key === labelColumn)?.type ?? null;
  }

  get isKpiType(): boolean {
    return this.vizForm.getRawValue().chart_type === 'kpi';
  }

  vizDatasetOptions(): Select3Option[] {
    return (this.project?.datasets ?? []).map((dataset) => ({ value: dataset.id, label: dataset.source_file }));
  }

  vizChartTypeOptions(): Select3Option[] {
    return this.chartTypes.map((type) => ({ value: type.value, label: type.label }));
  }

  vizLabelColumnSelect3Options(): Select3Option[] {
    const options = this.vizLabelColumnOptions().map((column) => ({ value: column.key, label: `${column.label} (${this.columnTypeLabel(column.type)})` }));
    if (!this.isKpiType) {
      options.unshift({ value: '', label: 'Selecciona...' });
    }
    return options;
  }

  vizValueColumnSelect3Options(): Select3Option[] {
    const options: Select3Option[] = [{ value: '', label: '— Conteo —' }];
    options.push(...this.vizValueColumnOptions().map((column) => ({ value: column.key, label: column.label })));
    return options;
  }

  vizAggregationOptions(): Select3Option[] {
    return this.aggregations.map((item) => ({ value: item.value, label: item.label }));
  }

  vizDateGroupingOptions(): Select3Option[] {
    const options: Select3Option[] = [{ value: '', label: 'Sin agrupar' }];
    options.push(...this.dateGroupings.map((item) => ({ value: item.value, label: item.label })));
    return options;
  }

  trackByDatasetId(_: number, dataset: { id: number }): number {
    return dataset.id;
  }

  trackByFilterKey(_: number, entry: { key: string }): string {
    return entry.key;
  }

  trackByVizId(_: number, visualization: PowerbiVisualizationResult): number {
    return visualization.id;
  }

  columnTypeLabel(type: string): string {
    switch (type) {
      case 'numeric':
        return 'numérica';
      case 'date':
        return 'fecha';
      default:
        return 'texto';
    }
  }

  datasetImportedLabel(dataset: PowerbiDataset): string {
    return dataset.imported_at ? new Date(dataset.imported_at).toLocaleDateString('es-CO') : '—';
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }
}
