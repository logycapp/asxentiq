import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { PowerbiChartPoint } from '../../core/services/powerbi.service';

const SERIES_COLOR = '#2563eb';
const VIBRANT_PALETTE = ['#2563eb', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'];
const PIE_PALETTE = VIBRANT_PALETTE;
const AREA_GRADIENT = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: 'rgba(37, 99, 235, 0.78)' },
  { offset: 0.55, color: 'rgba(6, 182, 212, 0.42)' },
  { offset: 1, color: 'rgba(16, 185, 129, 0.08)' }
]);
const AXIS_LABEL_COLOR = '#5f7189';
const AXIS_LINE_COLOR = 'rgba(15, 23, 42, 0.10)';
const GRID_LINE_COLOR = 'rgba(15, 23, 42, 0.08)';
const TOOLTIP_BG = '#ffffff';
const TOOLTIP_BORDER = 'rgba(15, 23, 42, 0.10)';
const TOOLTIP_TEXT = '#132238';

@Component({
  selector: 'app-powerbi-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pbi-chart">
      <div class="pbi-chart-header">
        <h3 class="pbi-chart-title">{{ title }}</h3>
      </div>

      <div *ngIf="chartType === 'kpi'" class="pbi-chart-kpi">
        <span class="pbi-chart-kpi-value">{{ formatKpi }}</span>
      </div>

      <div *ngIf="chartType === 'table'" class="pbi-chart-table-wrap">
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0 pbi-chart-table">
            <thead>
              <tr>
                <th>Etiqueta</th>
                <th class="text-end">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let point of points">
                <td>{{ point.label }}</td>
                <td class="text-end font-mono">{{ point.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="isEchartsType" [id]="containerId" class="pbi-chart-container"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .pbi-chart {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .pbi-chart-header {
      padding: 1rem 1rem 0.5rem;
    }

    .pbi-chart-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #132238;
    }

    .pbi-chart-kpi {
      display: grid;
      place-items: center;
      flex: 1 1 auto;
      padding: 1.5rem 1rem 2rem;
      min-height: 8rem;
    }

    .pbi-chart-kpi-value {
      font-size: 3.25rem;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #0457bf;
    }

    .pbi-chart-table-wrap {
      flex: 1 1 auto;
      overflow: auto;
      padding: 0.25rem 1rem 1rem;
    }

    .pbi-chart-table {
      font-size: 0.85rem;
    }

    .pbi-chart-table thead th {
      position: sticky;
      top: 0;
      background: #ffffff;
      color: #64748b;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      border-bottom-color: rgba(15, 23, 42, 0.1);
    }

    .pbi-chart-container {
      flex: 1 1 auto;
      min-height: 16rem;
    }

    @media (max-width: 575.98px) {
      .pbi-chart-container {
        min-height: 13rem;
      }

      .pbi-chart-kpi-value {
        font-size: 2.5rem;
      }
    }
  `]
})
export class PowerbiChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() chartType: string = 'bar';
  @Input() points: PowerbiChartPoint[] = [];
  @Input() kpi: number | null = null;

  readonly containerId = `pbi-chart-${Math.random().toString(36).slice(2, 10)}`;
  private chartInstance: echarts.ECharts | null = null;
  private viewInitialized = false;
  private pendingRender = false;

  get isEchartsType(): boolean {
    return ['bar', 'line', 'area', 'pie'].includes(this.chartType);
  }

  get formatKpi(): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(this.kpi ?? 0);
  }

  getExportImage(): string | null {
    return this.chartInstance?.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    }) ?? null;
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewInitialized && (changes['points'] || changes['chartType'])) {
      this.scheduleRender();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.chartInstance?.resize();
  }

  private scheduleRender(): void {
    if (this.pendingRender) {
      return;
    }

    this.pendingRender = true;
    setTimeout(() => {
      this.pendingRender = false;
      this.renderChart();
    });
  }

  private renderChart(): void {
    this.destroyChart();

    if (!this.isEchartsType) {
      return;
    }

    const container = document.getElementById(this.containerId);

    if (!container) {
      return;
    }

    this.chartInstance = echarts.init(container);

    if (this.chartType === 'pie') {
      this.chartInstance.setOption({
        color: PIE_PALETTE,
        tooltip: {
          trigger: 'item',
          appendToBody: true,
          confine: false,
          extraCssText: 'z-index: 3000;',
          backgroundColor: TOOLTIP_BG,
          borderColor: TOOLTIP_BORDER,
          textStyle: { color: TOOLTIP_TEXT }
        },
        series: [{
          type: 'pie',
          radius: ['0%', '68%'],
          center: ['50%', '52%'],
          label: { color: TOOLTIP_TEXT, formatter: '{b}: {c}' },
          data: this.points.map((point) => ({ name: point.label, value: point.value }))
        }]
      });

      return;
    }

    const isBar = this.chartType === 'bar';
    const categories = this.points.map((point) => point.label);
    const isArea = this.chartType === 'area';

    this.chartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        confine: false,
        extraCssText: 'z-index: 3000;',
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
        textStyle: { color: TOOLTIP_TEXT }
      },
      grid: { top: 24, right: 24, bottom: 44, left: isBar ? 72 : 56, containLabel: true },
      xAxis: {
        type: isBar ? 'value' : 'category',
        data: isBar ? undefined : categories,
        axisLabel: { color: AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        splitLine: { lineStyle: { color: GRID_LINE_COLOR } }
      },
      yAxis: {
        type: isBar ? 'category' : 'value',
        data: isBar ? categories : undefined,
        min: isBar ? undefined : 0,
        axisLabel: { color: AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
        splitLine: { lineStyle: { color: GRID_LINE_COLOR } }
      },
      series: [{
        type: isBar ? 'bar' : 'line',
        name: this.title,
        data: this.points.map((point) => point.value),
        itemStyle: {
          color: (params: { dataIndex: number }) => isBar
            ? VIBRANT_PALETTE[params.dataIndex % VIBRANT_PALETTE.length]
            : SERIES_COLOR,
          borderRadius: isBar ? 6 : 0
        },
        lineStyle: { color: SERIES_COLOR, width: 3 },
        symbol: 'circle',
        symbolSize: 7,
        smooth: !isBar,
        stack: isArea ? 'total' : undefined,
        areaStyle: isArea ? { color: AREA_GRADIENT } : undefined,
        label: { show: isBar, color: TOOLTIP_TEXT, position: isBar ? 'right' : 'top' }
      }]
    });
  }

  private destroyChart(): void {
    this.chartInstance?.dispose();
    this.chartInstance = null;
  }
}
