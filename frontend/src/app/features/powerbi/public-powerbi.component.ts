import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { jsPDF } from 'jspdf';

import { LoadingService } from '../../core/services/loading.service';
import { PowerbiFilterOption, PowerbiFilters, PowerbiPublicDataset, PowerbiPublicResponse, PowerbiService } from '../../core/services/powerbi.service';
import { PowerbiChartComponent } from './powerbi-chart.component';
import { Select3Component, Select3Option } from '../../shared/select3.component';

const PUBLIC_FILTER_KEYS = [
  'causal_evento_grave',
  'fecha_siniestro',
  'municipio_ocurrencia_siniestro',
  'departamento_ocurrencia_siniestro',
  'mecanismo'
];

@Component({
  selector: 'app-public-powerbi',
  standalone: true,
  imports: [CommonModule, FormsModule, PowerbiChartComponent, Select3Component],
  template: `
    <div class="public-pbi-shell">
      <div class="public-pbi-backdrop"></div>
      <div class="public-pbi-orb public-pbi-orb-a"></div>
      <div class="public-pbi-orb public-pbi-orb-b"></div>

      <div class="container public-pbi-container py-4 py-xl-5">
        <div class="public-pbi-hero mb-4">
          <div class="public-pbi-hero-layout d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-4">
            <div class="public-pbi-hero-main">
              <div class="public-pbi-hero-logo" *ngIf="response?.empresa">
                <img
                  *ngIf="response?.empresa?.logo_url; else publicHeroEmpresaIcon"
                  [src]="response?.empresa?.logo_url"
                  [alt]="'Logo de ' + response?.empresa?.name"
                >
                <ng-template #publicHeroEmpresaIcon>
                  <span class="material-symbols-outlined">business</span>
                </ng-template>
              </div>
              <div class="public-pbi-hero-copy">
                <div class="public-pbi-kicker">Panel público de visualización</div>
                <h1 class="public-pbi-title mb-2">{{ response?.project?.name }}</h1>
              </div>
            </div>

            <div class="d-flex flex-column align-items-end gap-3">
              <div class="public-pbi-identity" *ngIf="response?.empresa">
                <div>
                  <div class="public-pbi-identity-label">Empresa</div>
                  <div class="public-pbi-identity-value">{{ response?.empresa?.name }}</div>
                </div>
              </div>
              <button
                *ngIf="activeVisualizations.length > 0"
                type="button"
                class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold"
                (click)="downloadPdf()"
              >
                <span class="material-symbols-outlined">picture_as_pdf</span>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="text-center py-5">
          <div class="public-pbi-muted">Cargando panel...</div>
        </div>

        <div *ngIf="!loading && errorMessage" class="text-center py-5">
          <div class="public-pbi-muted">{{ errorMessage }}</div>
        </div>

        <ng-container *ngIf="!loading && response">
          <div *ngIf="response.datasets.length === 0" class="text-center py-5">
            <div class="public-pbi-muted">Este panel aún no tiene datos publicados.</div>
          </div>

          <div *ngIf="response.datasets.length > 1" class="public-pbi-tabs mb-4">
            <button
              *ngFor="let dataset of response.datasets; trackBy: trackByDatasetId"
              class="public-pbi-tab"
              [class.is-active]="activeDatasetId === dataset.id"
              (click)="selectDataset(dataset.id)"
            >
              <span class="material-symbols-outlined">table_view</span>
              <span>{{ dataset.source_file }}</span>
              <span class="public-pbi-tab-badge">{{ dataset.row_count }}</span>
            </button>
          </div>

          <div class="row g-4">
            <div class="col-12 col-lg-3">
              <div class="public-pbi-filter-card">
                <div class="public-pbi-filter-header">
                  <div class="d-flex align-items-center gap-2">
                    <span class="material-symbols-outlined public-pbi-filter-icon">tune</span>
                    <div>
                      <h2 class="public-pbi-filter-title">Filtros</h2>
                      <span class="public-pbi-muted small">Personaliza el panel</span>
                    </div>
                  </div>
                  <span class="public-pbi-filter-count">{{ activeFilterCount }} activos</span>
                </div>

                <div class="public-pbi-filter-summary">
                  {{ response.row_count }} registros coinciden
                </div>

                <div class="d-flex flex-column gap-3">
                  <ng-container *ngFor="let entry of filterOptions; trackBy: trackByFilterKey">
                    <div *ngIf="entry.option.type === 'string'" class="public-pbi-filter-field">
                      <label>{{ entry.option.label }}</label>
                      <app-select3
                        [options]="stringFilterOptionsFor(entry.key)"
                        [(ngModel)]="filterModels[entry.key]"
                        (ngModelChange)="onFilterModelChange(entry.key, $event)"
                        placeholder="Todos"
                        [clearable]="true"
                      ></app-select3>
                    </div>

                    <div *ngIf="entry.option.type === 'date'" class="public-pbi-filter-field">
                      <label>{{ entry.option.label }}</label>
                      <div class="public-pbi-date-range">
                        <div>
                          <span>Desde</span>
                          <input
                            class="form-control form-control-sm"
                            type="date"
                            [min]="entry.option.min"
                            [max]="entry.option.max"
                            [value]="filterDateValue(entry.key, 'from')"
                            (change)="setDateFilter(entry.key, 'from', $event)"
                          >
                        </div>
                        <div>
                          <span>Hasta</span>
                          <input
                            class="form-control form-control-sm"
                            type="date"
                            [min]="entry.option.min"
                            [max]="entry.option.max"
                            [value]="filterDateValue(entry.key, 'to')"
                            (change)="setDateFilter(entry.key, 'to', $event)"
                          >
                        </div>
                      </div>
                    </div>
                  </ng-container>

                  <div class="public-pbi-filter-actions">
                    <button type="button" class="btn btn-primary btn-sm" [disabled]="filterLoading" (click)="applyFilters()">
                      <span class="material-symbols-outlined">filter_alt</span>
                      {{ filterLoading ? 'Aplicando...' : 'Aplicar filtros' }}
                    </button>
                    <button type="button" class="btn btn-light btn-sm" (click)="resetFilters()">
                      <span class="material-symbols-outlined">restart_alt</span>
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-9">
              <div class="row g-3">
                <div
                  *ngFor="let visualization of activeVisualizations; trackBy: trackByVizId"
                  class="col-12 col-xl-6"
                >
                  <div class="public-pbi-card">
                    <app-powerbi-chart
                      [title]="visualization.title"
                      [chartType]="visualization.chart_type"
                      [points]="visualization.points"
                      [kpi]="visualization.kpi"
                    ></app-powerbi-chart>
                  </div>
                </div>
              </div>

              <div *ngIf="activeVisualizations.length === 0" class="text-center py-5">
                <div class="public-pbi-muted">No hay visualizaciones para este dataset.</div>
              </div>
            </div>
          </div>

          <footer class="public-pbi-footer text-center mt-5">
            <div class="public-pbi-muted">
              Generado con Asxentiq Power BI · {{ response.project.updated_at ? (response.project.updated_at | date: 'shortDate') : '' }}
            </div>
          </footer>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .public-pbi-shell {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 28%),
        radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.12), transparent 28%),
        linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #f4f7fb 100%);
      color: #0f172a;
    }

    .public-pbi-backdrop,
    .public-pbi-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(8px);
    }

    .public-pbi-backdrop {
      width: 30rem;
      height: 30rem;
      right: -8rem;
      top: -8rem;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.14), transparent 70%);
    }

    .public-pbi-orb {
      width: 16rem;
      height: 16rem;
      opacity: 0.5;
    }

    .public-pbi-orb-a {
      left: -6rem;
      top: 14%;
      background: radial-gradient(circle, rgba(103, 232, 249, 0.16), transparent 68%);
    }

    .public-pbi-orb-b {
      right: 7%;
      bottom: 10%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.12), transparent 68%);
    }

    .public-pbi-container {
      position: relative;
      z-index: 1;
    }

    .public-pbi-hero,
    .public-pbi-tabs,
    .public-pbi-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(18px);
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
    }

    .public-pbi-hero {
      border-radius: 28px;
      padding: 2rem 2.25rem;
      min-height: 14rem;
      display: flex;
      align-items: center;
    }

    .public-pbi-hero-main {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      min-width: 0;
    }

    .public-pbi-hero-layout {
      width: 100%;
    }

    .public-pbi-hero-logo {
      display: grid;
      place-items: center;
      width: 10.75rem;
      height: 10.75rem;
      flex: 0 0 10.75rem;
      border-radius: 1.1rem;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .public-pbi-hero-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 0.55rem;
    }

    .public-pbi-hero-logo .material-symbols-outlined {
      color: #0457bf;
      font-size: 3.5rem;
    }

    .public-pbi-kicker,
    .public-pbi-identity-label {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #64748b;
      font-weight: 700;
    }

    .public-pbi-kicker {
      font-size: 0.72rem;
    }

    .public-pbi-identity-label {
      font-size: 0.82rem;
    }

    .public-pbi-title {
      margin-top: 0.35rem;
      font-size: clamp(2.5rem, 4vw, 3.55rem);
      line-height: 1.05;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #0f172a;
    }

    .public-pbi-subtitle {
      max-width: 56rem;
      color: #334155;
      line-height: 1.7;
    }

    .public-pbi-identity {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.95rem 1.1rem;
      border-radius: 1.2rem;
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid rgba(15, 23, 42, 0.08);
      width: min(100%, 13.5rem);
      min-height: 6.25rem;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
    }

    .public-pbi-identity + .btn {
      width: min(100%, 13.5rem);
      justify-content: center;
      padding: 0.75rem 1rem;
      border-radius: 0.65rem;
    }

    .public-pbi-identity-value {
      margin-top: 0.2rem;
      font-size: 1.2rem;
      color: #0f172a;
      font-weight: 800;
    }

    .public-pbi-tabs {
      border-radius: 1.25rem;
      padding: 0.45rem;
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .public-pbi-tab {
      appearance: none;
      border: 0;
      border-radius: 1rem;
      padding: 0.75rem 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      color: #475569;
      background: transparent;
      font-weight: 700;
      transition: background 160ms ease, color 160ms ease;
    }

    .public-pbi-tab:hover {
      color: #0f172a;
    }

    .public-pbi-tab.is-active {
      background: linear-gradient(135deg, rgba(4, 87, 191, 0.1), rgba(4, 87, 191, 0.06));
      color: #0457bf;
      box-shadow: inset 0 0 0 1px rgba(4, 87, 191, 0.16);
    }

    .public-pbi-tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.9rem;
      height: 1.9rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(15, 23, 42, 0.1);
      color: #0f172a;
      font-size: 0.8rem;
      font-weight: 800;
    }

    .public-pbi-card {
      border-radius: 1rem;
      overflow: hidden;
    }

    .public-pbi-filter-card {
      height: 100%;
      padding: 1.15rem;
      border: 1px solid rgba(37, 99, 235, 0.14);
      border-radius: 1.25rem;
      background: linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.9));
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
    }

    .public-pbi-filter-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .public-pbi-filter-icon {
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.75rem;
      color: #2563eb;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(6, 182, 212, 0.12));
    }

    .public-pbi-filter-title {
      margin: 0 0 0.2rem;
      color: #0f172a;
      font-size: 1rem;
      font-weight: 800;
    }

    .public-pbi-filter-count {
      padding: 0.35rem 0.6rem;
      border-radius: 999px;
      color: #1d4ed8;
      background: rgba(37, 99, 235, 0.1);
      font-size: 0.7rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .public-pbi-filter-summary {
      margin: 1rem 0;
      padding: 0.7rem 0.8rem;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 0.75rem;
      color: #475569;
      background: rgba(255, 255, 255, 0.72);
      font-size: 0.78rem;
      font-weight: 600;
    }

    .public-pbi-filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .public-pbi-filter-field > label,
    .public-pbi-date-range span {
      color: #475569;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .public-pbi-date-range {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .public-pbi-date-range > div {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .public-pbi-filter-actions {
      display: grid;
      gap: 0.5rem;
      padding-top: 0.35rem;
    }

    .public-pbi-filter-actions .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      font-weight: 700;
    }

    .public-pbi-filter-actions .material-symbols-outlined {
      font-size: 1rem;
    }

    .public-pbi-muted {
      color: #64748b;
      font-weight: 600;
    }

    @media (max-width: 575.98px) {
      .public-pbi-hero {
        padding: 1.25rem;
        min-height: auto;
      }

      .public-pbi-hero-main {
        align-items: flex-start;
      }

      .public-pbi-hero-logo {
        width: 5rem;
        height: 5rem;
        flex-basis: 5rem;
      }

      .public-pbi-title {
        font-size: 1.8rem;
      }
    }
  `]
})
export class PublicPowerbiComponent implements OnInit {
  private readonly powerbiService = inject(PowerbiService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);

  @ViewChildren(PowerbiChartComponent) chartComponents!: QueryList<PowerbiChartComponent>;

  response: PowerbiPublicResponse | null = null;
  activeDatasetId: number | null = null;
  filters: PowerbiFilters = {};
  filterModels: Record<string, string> = {};
  filterLoading = false;
  loading = true;
  errorMessage = '';

  get activeVisualizations(): Array<{ id: number; title: string; chart_type: string; points: { label: string; value: number }[]; kpi: number | null }> {
    if (!this.response) {
      return [];
    }

    const dataset = this.response.datasets.find((item) => item.id === this.activeDatasetId) ?? this.response.datasets[0];

    return dataset?.visualizations ?? [];
  }

  get filterOptions(): Array<{ key: string; option: PowerbiFilterOption }> {
    return PUBLIC_FILTER_KEYS
      .filter((key) => this.response?.filter_options?.[key])
      .map((key) => ({ key, option: this.response!.filter_options[key] }));
  }

  get activeFilterCount(): number {
    return Object.values(this.filters).filter((value) => typeof value === 'string' ? value !== '' : Boolean(value.from || value.to)).length;
  }

  ngOnInit(): void {
    this.lockLightTheme();

    const token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!token) {
      this.errorMessage = 'El enlace no es válido.';
      this.loading = false;
      return;
    }

    this.loadPublic(token);
  }

  private lockLightTheme(): void {
    const html = document.documentElement;
    html.classList.remove('dark');
    html.classList.add('light');
  }

  private loadPublic(token: string, showPageLoading = true): void {
    if (showPageLoading) {
      this.loading = true;
    } else {
      this.filterLoading = true;
    }

    this.loadingService.track(this.powerbiService.getPublicDashboard(token, this.activeDatasetId, this.filters))
      .pipe(finalize(() => {
        if (showPageLoading) {
          this.loading = false;
        } else {
          this.filterLoading = false;
        }
      }))
      .subscribe({
      next: (response) => {
        this.response = response;
        this.activeDatasetId = this.activeDatasetId ?? response.datasets[0]?.id ?? null;
        this.syncFilterModels();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'El enlace no existe o no está publicado.';
      }
    });
  }

  selectDataset(datasetId: number): void {
    this.activeDatasetId = datasetId;
    this.filters = {};
    this.filterModels = {};
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.loadPublic(token);
  }

  stringFilterOptionsFor(key: string): Select3Option[] {
    return this.response?.filter_options?.[key]?.values?.map((value) => ({ value, label: value })) ?? [];
  }

  onFilterModelChange(key: string, value: string | null): void {
    if (!value) {
      delete this.filters[key];
      delete this.filterModels[key];
      return;
    }

    this.filters[key] = value;
    this.filterModels[key] = value;
  }

  filterDateValue(key: string, bound: 'from' | 'to'): string {
    const value = this.filters[key];
    return typeof value === 'object' ? (value[bound] ?? '') : '';
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

  applyFilters(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.loadPublic(token, false);
  }

  resetFilters(): void {
    this.filters = {};
    this.filterModels = {};
    this.applyFilters();
  }

  downloadPdf(): void {
    const images = this.chartComponents
      .toArray()
      .map((chart) => ({ title: chart.title, image: chart.getExportImage() }))
      .filter((item): item is { title: string; image: string } => item.image !== null);

    if (images.length === 0) {
      return;
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxImageWidth = pageWidth - margin * 2;
    const maxImageHeight = pageHeight - 32;

    pdf.setProperties({
      title: this.response?.project.name || 'Panel Power BI',
      subject: 'Visualizaciones Power BI'
    });

    images.forEach((item, index) => {
      if (index > 0) {
        pdf.addPage();
      }

      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text(item.title, margin, 14);

      const imageProperties = pdf.getImageProperties(item.image);
      const imageRatio = imageProperties.width / imageProperties.height;
      let imageWidth = maxImageWidth;
      let imageHeight = imageWidth / imageRatio;

      if (imageHeight > maxImageHeight) {
        imageHeight = maxImageHeight;
        imageWidth = imageHeight * imageRatio;
      }

      const imageX = (pageWidth - imageWidth) / 2;
      pdf.addImage(item.image, 'PNG', imageX, 20, imageWidth, imageHeight, undefined, 'FAST');
    });

    const filename = (this.response?.project.name || 'panel-powerbi')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '');
    pdf.save(`${filename || 'panel-powerbi'}.pdf`);
  }

  private syncFilterModels(): void {
    this.filterModels = {};

    for (const [key, value] of Object.entries(this.filters)) {
      if (typeof value === 'string') {
        this.filterModels[key] = value;
      }
    }
  }

  trackByDatasetId(_: number, dataset: { id: number }): number {
    return dataset.id;
  }

  trackByVizId(_: number, visualization: { id: number }): number {
    return visualization.id;
  }

  trackByFilterKey(_: number, entry: { key: string }): string {
    return entry.key;
  }
}
