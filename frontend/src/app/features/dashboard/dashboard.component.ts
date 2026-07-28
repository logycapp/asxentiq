import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingDashboardStats, TrainingService } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  accent: string;
  iconColor: string;
  helper: string;
  note: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly numberFormat = new Intl.NumberFormat('es-CO');

  loading = true;
  errorMessage = '';
  trainingMetrics: DashboardMetric[] = [];

  ngOnInit(): void {
    this.loadTrainingMetrics();
  }

  private loadTrainingMetrics(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.getDashboardStats())
      .subscribe({
        next: (stats) => {
          this.trainingMetrics = this.buildMetrics(stats);
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los indicadores de capacitaciones.';
          this.loading = false;
        }
      });
  }

  private buildMetrics(stats: TrainingDashboardStats): DashboardMetric[] {
    return [
      this.metric('Capacitaciones creadas', stats.total, 'school', 'text-primary', '#0457bf', 'Universo total', 'Todo el programa'),
      this.metric('Sesiones en agenda', stats.scheduled, 'event_available', 'text-chart-cyan', '#0298e2', 'En curso de planificación', 'Listas para ejecutar'),
      this.metric('Sesiones cerradas', stats.completed, 'task_alt', 'text-chart-green', '#24cfa0', 'Ya finalizadas', 'Con resultado confirmado'),
      this.metric('Sesiones canceladas', stats.cancelled, 'cancel', 'text-danger', '#e94d5b', 'No realizadas', 'Requieren seguimiento'),
      this.metric('Preguntas cargadas', stats.questions_total, 'quiz', 'text-primary', '#0457bf', 'Banco activo', 'Diseño de evaluación'),
      this.metric('Usuarios vinculados', stats.users_total, 'group_add', 'text-chart-cyan', '#0298e2', 'Equipo asignado', 'Cobertura interna'),
      this.metric('Participantes registrados', stats.participants_total, 'groups', 'text-chart-green', '#24cfa0', 'Asistencia potencial', 'Base de inscritos'),
      this.metric('Capacitaciones con preguntas', stats.with_questions, 'fact_check', 'text-warning', '#f5a524', 'Configuración lista', 'Ya tienen evaluación'),
    ];
  }

  private metric(label: string, value: number, icon: string, accent: string, iconColor: string, helper: string, note: string): DashboardMetric {
    return {
      label,
      value: this.numberFormat.format(value),
      icon,
      accent,
      iconColor,
      helper,
      note,
    };
  }
}
