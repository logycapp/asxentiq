import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import * as Highcharts from 'highcharts';
import {
  PowerbiChartPoint,
  PowerbiDashboardFilters,
  PowerbiDashboardRecord,
  PowerbiDashboardResponse,
  PowerbiService
} from '../../core/services/powerbi.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';
import { SwalAlertComponent } from '../../core/components/swal-alert.component';

interface DashboardSummaryCard {
  label: string;
  value: number;
  helper: string;
}

@Component({
  selector: 'app-powerbi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, SwalAlertComponent, DatePipe],
  templateUrl: './powerbi.component.html',
  styleUrl: './powerbi.component.css'
})
export class PowerbiComponent implements OnInit, OnDestroy {
  private readonly powerbiService = inject(PowerbiService);
  private readonly filterDefaults: PowerbiDashboardFilters = {
    date_from: null,
    date_to: null,
    department: null,
    municipality: null,
    causal: null,
    mechanism: null
  };

  loading = false;
  dashboardLoading = false;
  errorMessage = '';
  selectedFile: File | null = null;
  selectedFileName = '';
  savedRowsCount = 0;
  dashboard: PowerbiDashboardResponse | null = null;
  selectedRecord: PowerbiDashboardRecord | null = null;
  filters: PowerbiDashboardFilters = { ...this.filterDefaults };
  private chartInstances: Highcharts.Chart[] = [];
  private themeObserver: MutationObserver | null = null;
  private themeMode: 'dark' | 'light' = this.detectThemeMode();

  ngOnInit(): void {
    this.observeThemeChanges();
    this.loadDashboard();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.errorMessage = '';
    this.savedRowsCount = 0;

    if (this.selectedFile) {
      this.selectedFileName = this.selectedFile.name;
      this.saveAndRefresh();
    }
  }

  saveAndRefresh(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Selecciona un archivo Excel antes de continuar.';
      return;
    }

    const payload = new FormData();
    payload.append('file', this.selectedFile);

    this.loading = true;
    this.errorMessage = '';

    this.powerbiService
      .import(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.savedRowsCount = response.rows_inserted;
          this.selectedFileName = response.source_file;
          this.loadDashboard();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar la data del Excel.';
        }
      });
  }

  loadDashboard(): void {
    this.dashboardLoading = true;
    this.errorMessage = '';

    this.powerbiService
      .dashboard(this.filters)
      .pipe(finalize(() => (this.dashboardLoading = false)))
      .subscribe({
        next: (response) => {
          this.dashboard = response;
          this.selectedRecord = response.records[0] ?? null;
          this.scheduleChartRender();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible cargar el dashboard.';
        }
      });
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  resetFilters(): void {
    this.filters = { ...this.filterDefaults };
    this.loadDashboard();
  }

  selectRecord(record: PowerbiDashboardRecord): void {
    this.selectedRecord = record;
  }

  get summaryCards(): DashboardSummaryCard[] {
    const summary = this.dashboard?.summary;

    if (!summary) {
      return [];
    }

    return [
      { label: 'Total de siniestros', value: summary.total_records, helper: 'Registros cargados' },
      { label: 'Este año', value: summary.current_year_records, helper: 'Eventos del año actual' },
      { label: 'Este mes', value: summary.current_month_records, helper: 'Eventos del mes actual' },
      { label: 'Departamentos', value: summary.departments_count, helper: 'Cobertura geográfica' },
      { label: 'Causales', value: summary.causals_count, helper: 'Clasificación del evento' },
      { label: 'Diagnósticos', value: summary.diagnoses_count, helper: 'CIE-10 distintos' }
    ];
  }

  get totalRecords(): number {
    return this.dashboard?.summary.total_records ?? 0;
  }

  get availableDepartments(): string[] {
    return this.dashboard?.available_filters.departments ?? [];
  }

  get availableMunicipalities(): string[] {
    return this.dashboard?.available_filters.municipalities ?? [];
  }

  get availableCausals(): string[] {
    return this.dashboard?.available_filters.causals ?? [];
  }

  get availableMechanisms(): string[] {
    return this.dashboard?.available_filters.mechanisms ?? [];
  }

  get records(): PowerbiDashboardRecord[] {
    return this.dashboard?.records ?? [];
  }

  get dashboardEmpty(): boolean {
    return !this.dashboard || this.totalRecords === 0;
  }

  get selectedRecordDetails(): Array<{ label: string; value: string }> {
    const record = this.selectedRecord;

    if (!record) {
      return [];
    }

    return [
      { label: 'Siniestro', value: record.numero_siniestro ?? 'No determinado' },
      { label: 'Identificacion', value: record.no_identificacion ?? 'No determinado' },
      { label: 'NIT', value: record.nit ?? 'No determinado' },
      { label: 'Fecha', value: record.fecha_siniestro ? new Date(record.fecha_siniestro).toLocaleDateString('es-CO') : 'No determinado' },
      { label: 'Departamento', value: record.departamento_ocurrencia_siniestro ?? 'No determinado' },
      { label: 'Municipio', value: record.municipio_ocurrencia_siniestro ?? 'No determinado' },
      { label: 'Causal', value: record.causal_evento_grave ?? 'No determinado' },
      { label: 'Mecanismo', value: record.mecanismo ?? 'No determinado' },
      { label: 'Diagnostico', value: `${record.cie_10_dx_1 ?? ''} ${record.nombre_dx_1 ?? ''}`.trim() || 'No determinado' }
    ];
  }

  trackByRecordId(_: number, record: PowerbiDashboardRecord): number {
    return record.id;
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.selectedFile = null;
  }

  private renderCharts(): void {
    this.destroyCharts();

    if (!this.dashboard) {
      return;
    }

    const palette = this.getChartPalette();

    this.renderMonthlyChart(palette.monthly);
    this.renderCategoryChart('powerbiCausalChart', 'Eventos por causal', this.dashboard.charts.causal, palette.causal);
    this.renderCategoryChart('powerbiDepartmentChart', 'Casos por departamento', this.dashboard.charts.department, palette.department);
    this.renderCategoryChart('powerbiMechanismChart', 'Casos por mecanismo', this.dashboard.charts.mechanism, palette.mechanism);
    this.renderCategoryChart('powerbiDiagnosisChart', 'CIE-10 más frecuentes', this.dashboard.charts.diagnosis, palette.diagnosis);
  }

  private renderMonthlyChart(color: string): void {
    const containerId = 'powerbiMonthlyChart';
    const chart = Highcharts.chart(containerId, {
      chart: {
        type: 'areaspline',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit'
        }
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: this.dashboard?.charts.monthly.map((point) => point.label) ?? [],
        labels: {
          style: { color: this.getAxisLabelColor() }
        },
        lineColor: this.getAxisLineColor(),
        tickColor: this.getAxisLineColor()
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          style: { color: this.getAxisLabelColor() }
        },
        gridLineColor: this.getGridLineColor()
      },
      tooltip: {
        backgroundColor: this.getTooltipBackgroundColor(),
        borderColor: this.getTooltipBorderColor(),
        style: { color: this.getTooltipTextColor() }
      },
      plotOptions: {
        areaspline: {
          marker: { enabled: true, radius: 4 }
        }
      },
      series: [
        {
          type: 'areaspline',
          name: 'Siniestros',
          data: this.dashboard?.charts.monthly.map((point) => point.value) ?? [],
          color,
          fillOpacity: 0.18
        }
      ]
    } as Highcharts.Options);

    this.chartInstances.push(chart);
  }

  private renderCategoryChart(containerId: string, title: string, points: PowerbiChartPoint[], color: string): void {
    const chart = Highcharts.chart(containerId, {
      chart: {
        type: 'bar',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit'
        }
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        visible: false,
        labels: {
          style: { color: this.getAxisLabelColor() }
        },
        lineColor: this.getAxisLineColor(),
        tickColor: this.getAxisLineColor(),
        title: { text: undefined }
      },
      yAxis: {
        categories: points.map((point) => point.label),
        min: 0,
        title: { text: undefined },
        labels: {
          style: { color: this.getAxisLabelColor() }
        },
        gridLineColor: this.getGridLineColor()
      },
      tooltip: {
        backgroundColor: this.getTooltipBackgroundColor(),
        borderColor: this.getTooltipBorderColor(),
        style: { color: this.getTooltipTextColor() }
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          dataLabels: {
            enabled: true,
            style: {
              color: this.getTooltipTextColor(),
              textOutline: 'none'
            }
          }
        }
      },
      series: [
        {
          type: 'bar',
          name: title,
          data: points.map((point) => point.value),
          color
        }
      ]
    } as Highcharts.Options);

    this.chartInstances.push(chart);
  }

  private scheduleChartRender(): void {
    setTimeout(() => {
      if (this.themeMode !== this.detectThemeMode()) {
        this.themeMode = this.detectThemeMode();
      }

      this.renderCharts();
    });
  }

  private observeThemeChanges(): void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    this.themeObserver?.disconnect();
    this.themeObserver = new MutationObserver(() => {
      const nextTheme = this.detectThemeMode();

      if (nextTheme !== this.themeMode) {
        this.themeMode = nextTheme;

        if (this.dashboard) {
          this.scheduleChartRender();
        }
      }
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private detectThemeMode(): 'dark' | 'light' {
    if (typeof document === 'undefined') {
      return 'dark';
    }

    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  }

  private getChartPalette(): {
    monthly: string;
    causal: string;
    department: string;
    mechanism: string;
    diagnosis: string;
  } {
    if (this.themeMode === 'light') {
      return {
        monthly: '#1f7ae0',
        causal: '#24cfa0',
        department: '#0457bf',
        mechanism: '#f5a524',
        diagnosis: '#7a5cff'
      };
    }

    return {
      monthly: '#7ebdff',
      causal: '#69f0c8',
      department: '#73e8ff',
      mechanism: '#ffd27a',
      diagnosis: '#b59bff'
    };
  }

  private getAxisLabelColor(): string {
    return this.themeMode === 'light' ? '#5f7189' : '#b8c7df';
  }

  private getAxisLineColor(): string {
    return this.themeMode === 'light' ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255,255,255,0.12)';
  }

  private getGridLineColor(): string {
    return this.themeMode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.08)';
  }

  private getTooltipBackgroundColor(): string {
    return this.themeMode === 'light' ? '#ffffff' : '#0f1729';
  }

  private getTooltipBorderColor(): string {
    return this.themeMode === 'light' ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255,255,255,0.12)';
  }

  private getTooltipTextColor(): string {
    return this.themeMode === 'light' ? '#132238' : '#f8fbff';
  }

  private destroyCharts(): void {
    for (const chart of this.chartInstances) {
      chart.destroy();
    }

    this.chartInstances = [];
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }
}
