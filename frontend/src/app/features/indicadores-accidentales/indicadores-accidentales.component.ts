import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as echarts from 'echarts';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { INDICADORES_DATA } from './indicadores-accidentales.data';

interface AccidentRow {
  fecha: string;
  cedula: string;
  nombre: string;
  empresa: string;
  dias: number;
  cargados: number;
  cie10: string;
  parte: string;
  calificacion: string;
  municipio: string;
  tipo_at: string;
  mecanismo: string;
}

interface WorkerRow { ingreso: string; empresa: string; dias: number; }
interface AbsenceRow { fecha: string; dias: number; cont: string; }
interface IndicatorData {
  meses: string[];
  anio: number;
  mes_max: number;
  trab_mes: number[];
  rows: AccidentRow[];
  trab: WorkerRow[];
  aus_rows: AbsenceRow[];
  aus: { kpis: Record<string, number>; charts: Record<string, any> };
}

interface AccidentFilters {
  empresa: string;
  municipio: string;
  calificacion: string;
  tipo_at: string;
  desde: string;
  hasta: string;
}

const DATA = INDICADORES_DATA as unknown as IndicatorData;
const ACCIDENT_COLORS = ['#0298E2', '#24CFA0', '#7C8CF8', '#F5B54A', '#E8647C', '#5BC0BE'];
const TXT = '#334155';
const GRID = 'rgba(15, 23, 42, 0.10)';

@Component({
  selector: 'app-indicadores-accidentales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent],
  templateUrl: './indicadores-accidentales.component.html',
  styleUrl: './indicadores-accidentales.component.css'
})
export class IndicadoresAccidentalesComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('chart') chartElements!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild('expandedChart') expandedChartElement?: ElementRef<HTMLDivElement>;

  readonly year = DATA.anio;
  readonly months = DATA.meses.slice(0, DATA.mes_max);
  readonly companies = this.unique('empresa');
  readonly municipalities = this.unique('municipio');
  readonly qualifications = this.unique('calificacion');
  readonly accidentTypes = this.unique('tipo_at');
  readonly dateMin = [...DATA.rows].sort((a, b) => a.fecha.localeCompare(b.fecha))[0]?.fecha ?? '';
  readonly dateMax = [...DATA.rows].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.fecha ?? '';
  readonly absenceKpis = DATA.aus.kpis;

  filters: AccidentFilters = { empresa: '', municipio: '', calificacion: '', tipo_at: '', desde: '', hasta: '' };
  search = '';
  page = 1;
  readonly pageSize = 10;
  filteredRows: AccidentRow[] = DATA.rows;
  activeChartId = '';
  activeChartTitle = '';
  activeChartNote = '';
  private charts = new Map<string, echarts.ECharts>();
  private expandedChart: echarts.ECharts | null = null;
  private viewInitialized = false;

  get totalPages(): number { return Math.max(1, Math.ceil(this.searchedRows.length / this.pageSize)); }
  get searchedRows(): AccidentRow[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    if (!query) return this.filteredRows;
    return this.filteredRows.filter(row => [row.fecha, row.cedula, row.nombre, row.empresa, row.cie10, row.parte, row.municipio, row.tipo_at, row.mecanismo]
      .some(value => String(value ?? '').toLocaleLowerCase('es').includes(query)));
  }
  get paginatedRows(): AccidentRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.searchedRows.slice(start, start + this.pageSize);
  }
  get startRecord(): number { return this.searchedRows.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get endRecord(): number { return Math.min(this.page * this.pageSize, this.searchedRows.length); }
  get visiblePages(): number[] {
    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - 4));
    return Array.from({ length: Math.min(5, this.totalPages) }, (_, index) => start + index);
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.charts.forEach(chart => chart.dispose());
    this.charts.clear();
    this.expandedChart?.dispose();
    this.expandedChart = null;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.charts.forEach(chart => chart.resize());
    this.expandedChart?.resize();
  }

  openChart(id: string): void {
    const source = this.chartElements.find(reference => reference.nativeElement.dataset['chart'] === id)?.nativeElement;
    const card = source?.closest('.indicator-chart-card');
    if (!source || !card) return;
    this.activeChartId = id;
    this.activeChartTitle = card.querySelector('.indicator-chart-title')?.textContent?.trim() ?? 'Gráfica';
    this.activeChartNote = card.querySelector('.indicator-formula')?.textContent?.trim() ?? '';
    setTimeout(() => this.renderExpandedChart());
  }

  closeChart(): void {
    this.expandedChart?.dispose();
    this.expandedChart = null;
    this.activeChartId = '';
    this.activeChartTitle = '';
    this.activeChartNote = '';
  }

  onFiltersChanged(): void {
    this.filteredRows = DATA.rows.filter(row =>
      (!this.filters.empresa || row.empresa === this.filters.empresa) &&
      (!this.filters.municipio || row.municipio === this.filters.municipio) &&
      (!this.filters.calificacion || row.calificacion === this.filters.calificacion) &&
      (!this.filters.tipo_at || row.tipo_at === this.filters.tipo_at) &&
      (!this.filters.desde || row.fecha >= this.filters.desde) &&
      (!this.filters.hasta || row.fecha <= this.filters.hasta));
    this.page = 1;
    this.updateCharts();
  }

  onSearchChanged(): void { this.page = 1; }

  clearFilters(): void {
    this.filters = { empresa: '', municipio: '', calificacion: '', tipo_at: '', desde: '', hasta: '' };
    this.search = '';
    this.page = 1;
    this.onFiltersChanged();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.page = page;
  }

  downloadCsv(): void {
    const headers = ['Fecha accidente', 'Cédula', 'Nombre', 'Días de incapacidad', 'CIE 10', 'Parte del cuerpo aparentemente afectada'];
    const rows = this.filteredRows.map(row => [this.dateLabel(row.fecha), row.cedula, row.nombre, row.dias, row.cie10, row.parte]);
    const escapeCell = (value: unknown): string => {
      if (typeof value === 'number') return String(value);
      let text = String(value ?? '');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `detalle_accidentes_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  dateLabel(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  number(value: number, digits = 2): string {
    return Number(value ?? 0).toLocaleString('es-CO', { maximumFractionDigits: digits });
  }

  currency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value ?? 0);
  }

  private unique(field: keyof AccidentRow): string[] {
    return [...new Set(DATA.rows.map(row => row[field]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es'));
  }

  private sum(values: number[]): number { return values.reduce((total, value) => total + value, 0); }
  private monthIndex(date: string): number { return Number(date.slice(5, 7)) - 1; }
  private monthValues(rows: AccidentRow[], field: 'count' | 'days'): number[] {
    return this.months.map((_, month) => rows.reduce((total, row) => this.monthIndex(row.fecha) === month ? total + (field === 'count' ? 1 : row.dias) : total, 0));
  }

  private monthlyIndicators(): { frequency: number[]; severity: number[]; medicalAbsence: number[]; fatal: number[]; prevalence: number[]; incidence: number[] } {
    const months = this.months.map((_, index) => index + 1);
    const workers = this.filters.empresa && DATA.trab.some(worker => worker.empresa === this.filters.empresa)
      ? DATA.trab.filter(worker => worker.empresa === this.filters.empresa) : DATA.trab;
    const workersByMonth = months.map(month => workers.filter(worker => worker.ingreso <= this.endOfMonth(month)).length);
    const scheduledDays = months.map(month => {
      const start = new Date(DATA.anio, month - 1, 1);
      const end = new Date(DATA.anio, month, 0);
      let total = 0;
      workers.forEach(worker => {
        if (worker.ingreso > this.endOfMonth(month)) return;
        const hireDate = new Date(`${worker.ingreso}T00:00:00`);
        const cursor = new Date(hireDate > start ? hireDate : start);
        for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
          if ((cursor.getDay() + 6) % 7 < worker.dias) total++;
        }
      });
      return total;
    });
    const rowsByMonth = months.map(month => this.filteredRows.filter(row => this.monthIndex(row.fecha) + 1 === month));
    const frequency = months.map((_, index) => workersByMonth[index] ? rowsByMonth[index].length / workersByMonth[index] * 100 : 0);
    const severity = months.map((_, index) => workersByMonth[index]
      ? this.sum(rowsByMonth[index].map(row => row.dias + row.cargados)) / workersByMonth[index] * 100 : 0);
    let cumulativeFatal = 0;
    let cumulativeAccidents = 0;
    const fatal = months.map((_, index) => {
      cumulativeFatal += rowsByMonth[index].filter(row => row.tipo_at === 'MORTAL').length;
      cumulativeAccidents += rowsByMonth[index].length;
      return cumulativeAccidents ? cumulativeFatal / cumulativeAccidents * 100 : 0;
    });
    const medicalAbsence = months.map((month, index) => {
      const absenceDays = DATA.aus_rows.filter(row => ['EG', 'AT'].includes(row.cont) && this.monthIndex(row.fecha) + 1 === month)
        .reduce((sum, row) => sum + row.dias, 0);
      return scheduledDays[index] ? absenceDays / scheduledDays[index] * 100 : 0;
    });
    const occupationalIllness = DATA.aus_rows.filter(row => ['EL', 'ENFERMEDAD LABORAL', 'ENFERMEDAD PROFESIONAL'].includes(row.cont));
    const newCases = months.map(month => occupationalIllness.filter(row => this.monthIndex(row.fecha) + 1 === month).length);
    const incidence = months.map((_, index) => workersByMonth[index] ? newCases[index] / workersByMonth[index] * 100000 : 0);
    let accumulatedCases = 0;
    const prevalence = months.map((_, index) => {
      accumulatedCases += newCases[index];
      const averageWorkers = this.sum(workersByMonth.slice(0, index + 1)) / (index + 1);
      return averageWorkers ? accumulatedCases / averageWorkers * 100000 : 0;
    });
    return { frequency, severity, medicalAbsence, fatal, prevalence, incidence };
  }

  private getKpis(): { label: string; value: string; accent: string }[] {
    const total = this.filteredRows.length;
    const incapacityDays = this.sum(this.filteredRows.map(row => row.dias));
    const totalDays = this.sum(this.filteredRows.map(row => row.dias + row.cargados));
    const averageWorkers = this.sum(DATA.trab_mes.slice(0, DATA.mes_max)) / DATA.mes_max;
    return [
      { label: 'Total accidentes', value: this.number(total, 0), accent: ACCIDENT_COLORS[0] },
      { label: 'Frecuencia', value: this.number(total / averageWorkers * 100), accent: ACCIDENT_COLORS[2] },
      { label: 'Severidad', value: this.number(totalDays / averageWorkers * 100), accent: ACCIDENT_COLORS[1] },
      { label: 'Días de incapacidad', value: this.number(incapacityDays, 0), accent: ACCIDENT_COLORS[3] },
      { label: 'Promedio de días por AT', value: this.number(total ? incapacityDays / total : 0), accent: ACCIDENT_COLORS[5] },
      { label: 'Graves', value: this.number(this.filteredRows.filter(row => row.tipo_at === 'GRAVE').length, 0), accent: ACCIDENT_COLORS[4] },
      { label: 'Mortales', value: this.number(this.filteredRows.filter(row => row.tipo_at === 'MORTAL').length, 0), accent: '#E8647C' }
    ];
  }

  get kpis(): { label: string; value: string; accent: string }[] { return this.getKpis(); }

  private chartBase(): echarts.EChartsOption {
    return {
      color: ACCIDENT_COLORS,
      backgroundColor: 'transparent',
      textStyle: { color: TXT },
      grid: { left: 12, right: 18, top: 36, bottom: 14, containLabel: true },
      tooltip: { backgroundColor: '#fff', borderColor: '#cbd5e1', textStyle: { color: TXT }, confine: true },
      legend: { top: 0, textStyle: { color: TXT } }
    };
  }

  private axisX(data: string[]): any { return { type: 'category', data, axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel: { color: '#64748b' } }; }
  private axisY(name: string): any { return { type: 'value', name, nameTextStyle: { color: '#64748b' }, splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: '#64748b' } }; }
  private averageLine(color = '#F5B54A'): any {
    return { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color, width: 1.5 }, label: { show: false }, data: [{ type: 'average' }] };
  }
  private pieOption(points: { name: string; value: number }[]): echarts.EChartsOption {
    return { ...this.chartBase(), grid: undefined, tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#cbd5e1', textStyle: { color: TXT }, formatter: '{b}<br/><b>{c}</b> ({d}%)' }, legend: { bottom: 0, textStyle: { color: TXT } }, series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '45%'], label: { show: false }, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }, data: points }] };
  }

  private rankingOption(points: { name: string; value: number }[], color: string): echarts.EChartsOption {
    const values = points.map(point => point.value);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    return {
      ...this.chartBase(), grid: { left: 10, right: 42, top: 10, bottom: 10, containLabel: true }, legend: { show: false },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#fff', borderColor: '#cbd5e1', textStyle: { color: TXT } },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', inverse: true, data: points.map(point => point.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: TXT, width: 170, overflow: 'truncate' } },
      series: [{ type: 'bar', barMaxWidth: 16, data: points.map(point => ({ value: point.value, itemStyle: { color: max === min ? color : this.alpha(color, 0.25 + 0.75 * (point.value - min) / (max - min)), borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: TXT } }]
    };
  }

  private alpha(hex: string, alpha: number): string {
    const value = Number.parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  private groupCounts(rows: AccidentRow[], field: keyof AccidentRow, top = 0): { name: string; value: number }[] {
    const counts = new Map<string, number>();
    rows.forEach(row => { const key = String(row[field] ?? ''); if (key) counts.set(key, (counts.get(key) ?? 0) + 1); });
    const result = [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return top ? result.slice(0, top) : result;
  }

  private options(): Record<string, echarts.EChartsOption> {
    const labels = this.months;
    const accidentCounts = this.monthValues(this.filteredRows, 'count');
    const incapacity = this.monthValues(this.filteredRows, 'days');
    const indicators = this.monthlyIndicators();
    const lineIndicator = (values: number[], color: string, unit = '%', yName = '%'): echarts.EChartsOption => {
      const zero = values.every(value => !value);
      return { ...this.chartBase(), color: [color], legend: { show: false }, tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#cbd5e1', textStyle: { color: TXT } }, xAxis: this.axisX(labels), yAxis: { ...this.axisY(yName), ...(zero ? { min: -1, max: 1, interval: 1 } : {}) }, series: [{ name: yName, type: 'line', smooth: true, symbolSize: 8, data: values.map(value => +value.toFixed(2)), label: { show: true, color: TXT, formatter: (item: any) => `${this.number(Number(item.value))}${unit}` }, markLine: zero ? undefined : this.averageLine() }] };
    };
    const absenceCharts = DATA.aus.charts;
    return {
      c1: { ...this.chartBase(), tooltip: { trigger: 'axis' }, xAxis: this.axisX(labels), yAxis: this.axisY('Nro.'), series: [{ name: 'Accidentes', type: 'line', smooth: true, symbolSize: 8, data: accidentCounts, areaStyle: { opacity: 0.15 }, label: { show: true, color: TXT }, markLine: this.averageLine() }] },
      c2: { ...this.chartBase(), tooltip: { trigger: 'axis' }, xAxis: this.axisX(labels), yAxis: this.axisY('Días'), series: [{ name: 'Días', type: 'bar', barMaxWidth: 30, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: incapacity, label: { show: true, position: 'top', color: TXT }, markLine: this.averageLine() }] },
      c3: this.pieOption(this.groupCounts(this.filteredRows, 'tipo_at')),
      c4: this.rankingOption(this.groupCounts(this.filteredRows, 'mecanismo', 8), '#0298E2'),
      r1: lineIndicator(indicators.frequency, '#0298E2'),
      r2: lineIndicator(indicators.severity, '#10a97f'),
      r3: lineIndicator(indicators.medicalAbsence, '#7C8CF8'),
      r4: lineIndicator(indicators.fatal, '#E8647C'),
      r5: lineIndicator(indicators.prevalence, '#F5B54A', '', 'x 100.000'),
      r6: lineIndicator(indicators.incidence, '#5BC0BE', '', 'x 100.000'),
      c5: { ...this.chartBase(), grid: { left: 12, right: 18, top: 64, bottom: 14, containLabel: true }, tooltip: { trigger: 'axis' }, xAxis: this.axisX(labels), yAxis: [{ ...this.axisY('Valor reconocido'), axisLabel: { color: '#64748b', formatter: (value: number) => `${value / 1e6} M` } }, { ...this.axisY('Ausentismo'), splitLine: { show: false } }], series: [{ name: 'Valor reconocido', type: 'bar', barMaxWidth: 30, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: absenceCharts['reconocido_mes'].slice(0, DATA.mes_max), markLine: this.averageLine() }, { name: 'Total ausentismo', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 8, data: absenceCharts['eventos_mes'].slice(0, DATA.mes_max), markLine: this.averageLine('#E8647C') }] },
      c6: this.pieOption(absenceCharts['contingencia']),
      c7: this.rankingOption(absenceCharts['top_dx'], '#24CFA0')
    };
  }

  private renderCharts(): void {
    if (!this.viewInitialized) return;
    const chartOptions = this.options();
    this.chartElements.forEach(reference => {
      const element = reference.nativeElement;
      const id = element.dataset['chart'];
      if (!id) return;
      let chart = this.charts.get(id);
      if (!chart) {
        chart = echarts.init(element);
        this.charts.set(id, chart);
      }
      chart.setOption(chartOptions[id], true);
    });
  }

  private updateCharts(): void {
    if (this.viewInitialized) {
      this.renderCharts();
      if (this.activeChartId) this.renderExpandedChart();
    }
  }

  private renderExpandedChart(): void {
    const element = this.expandedChartElement?.nativeElement;
    if (!element || !this.activeChartId) return;
    if (!this.expandedChart) this.expandedChart = echarts.init(element);
    this.expandedChart.setOption(this.options()[this.activeChartId], true);
    this.expandedChart.resize();
  }

  private endOfMonth(month: number): string {
    const lastDay = new Date(DATA.anio, month, 0).getDate();
    return `${DATA.anio}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }
}
