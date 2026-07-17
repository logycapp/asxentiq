import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Training, PublicUser, TrainingCategory } from '../../core/services/training.service';

@Component({
  selector: 'app-public-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-0">Bienvenido, {{ user?.name }}</h4>
          <small class="text-muted">Cedula: {{ user?.document_number }}</small>
        </div>
        <button class="btn btn-outline-danger btn-sm" (click)="logout()">Cerrar sesion</button>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab === 'pending'" (click)="tab = 'pending'">
            Pendientes
            <span *ngIf="pending.length > 0" class="badge bg-warning ms-1">{{ pending.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab === 'completed'" (click)="tab = 'completed'">
            Completadas
          </button>
        </li>
      </ul>

      <!-- Pending -->
      <div *ngIf="tab === 'pending'">
        <div *ngIf="pending.length === 0" class="text-muted py-4 text-center">
          No tienes capacitaciones pendientes.
        </div>

        <div *ngFor="let group of pendingGroups" class="card mb-3">
          <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
            <div>
              <strong>Programa: {{ categoryLabel(group.category) }}</strong>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="togglePendingGroup(group.category)">
                {{ isPendingGroupExpanded(group.category) ? 'Ocultar capacitaciones' : 'Abrir capacitaciones' }}
              </button>
              <span class="badge bg-secondary">{{ group.trainings.length }}</span>
            </div>
          </div>
          <div *ngIf="isPendingGroupExpanded(group.category)" class="card-body">
            <div *ngFor="let t of group.trainings" class="d-flex justify-content-between align-items-center gap-3 py-2 border-bottom">
              <div>
                <h6 class="mb-1">{{ t.title }}</h6>
                <small class="text-muted">
                  {{ typeLabel(t.type) }} | {{ t.questions_count }} preguntas
                </small>
              </div>
              <a [routerLink]="['/public/trainings', t.id, 'take']" class="btn btn-primary btn-sm">
                Realizar
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed -->
      <div *ngIf="tab === 'completed'">
        <div *ngIf="completed.length === 0" class="text-muted py-4 text-center">
          No has completado ninguna capacitacion.
        </div>

        <div *ngFor="let group of completedGroups" class="card mb-3">
          <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
            <div>
              <strong>Programa: {{ categoryLabel(group.category) }}</strong>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="toggleCompletedGroup(group.category)">
                {{ isCompletedGroupExpanded(group.category) ? 'Ocultar capacitaciones' : 'Abrir capacitaciones' }}
              </button>
              <span class="badge bg-secondary">{{ group.trainings.length }}</span>
            </div>
          </div>
          <div *ngIf="isCompletedGroupExpanded(group.category)" class="card-body">
            <div *ngFor="let t of group.trainings" class="d-flex justify-content-between align-items-center gap-3 py-2 border-bottom">
              <div>
                <h6 class="mb-1">{{ t.title }}</h6>
                <small class="text-muted">{{ typeLabel(t.type) }}</small>
              </div>
              <div class="text-end">
                <div *ngIf="t.participants && t.participants[0]" class="mb-1">
                  <span
                    *ngIf="$any(t.participants[0].pivot).score !== null"
                    [class]="'badge ' + ($any(t.participants[0].pivot).score >= t.passing_score ? 'bg-success' : 'bg-danger')"
                  >
                    {{ $any(t.participants[0].pivot).score }}%
                  </span>
                  <span *ngIf="$any(t.participants[0].pivot).score === null" class="badge bg-warning text-dark">
                    Pendiente de revision
                  </span>
                  <span *ngIf="$any(t.participants[0].pivot).completed_at" class="d-block small text-muted">
                    {{ $any(t.participants[0].pivot).completed_at | date:'shortDate' }}
                  </span>
                </div>
                <div class="mt-2">
                  <a [routerLink]="['/public/trainings', t.id, 'result']" class="btn btn-sm btn-outline-primary me-1">
                    Ver resultado
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PublicDashboardComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  user: PublicUser | null = null;
  pending: Training[] = [];
  completed: Training[] = [];
  tab: 'pending' | 'completed' = 'pending';
  expandedPendingProgramKeys = new Set<string>();
  expandedCompletedProgramKeys = new Set<string>();

  ngOnInit(): void {
    const stored = localStorage.getItem('public_user');
    if (stored) {
      this.user = JSON.parse(stored);
    }

    this.loadPending();
    this.loadCompleted();
  }

  loadPending(): void {
    this.loadingService.track(this.trainingService.getPending()).subscribe({
      next: (data) => (this.pending = data)
    });
  }

  loadCompleted(): void {
    this.loadingService.track(this.trainingService.getCompleted()).subscribe({
      next: (data) => (this.completed = data)
    });
  }

  get pendingGroups(): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    return this.groupTrainings(this.pending);
  }

  get completedGroups(): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    return this.groupTrainings(this.completed);
  }

  logout(): void {
    localStorage.removeItem('public_token');
    localStorage.removeItem('public_user');
    this.router.navigate(['/public/trainings']);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      medical_exam: 'Examen Medico',
      sst_training: 'Capacitacion SST',
      drill: 'Simulacro',
      induction: 'Induccion'
    };
    return labels[type] || type;
  }

  categoryLabel(category: TrainingCategory | null): string {
    return category?.name || 'Sin programa';
  }

  programKey(category: TrainingCategory | null): string {
    return category ? `program-${category.id}` : 'program-uncategorized';
  }

  isPendingGroupExpanded(category: TrainingCategory | null): boolean {
    return this.expandedPendingProgramKeys.has(this.programKey(category));
  }

  isCompletedGroupExpanded(category: TrainingCategory | null): boolean {
    return this.expandedCompletedProgramKeys.has(this.programKey(category));
  }

  togglePendingGroup(category: TrainingCategory | null): void {
    const key = this.programKey(category);

    if (this.expandedPendingProgramKeys.has(key)) {
      this.expandedPendingProgramKeys.delete(key);
      return;
    }

    this.expandedPendingProgramKeys.add(key);
  }

  toggleCompletedGroup(category: TrainingCategory | null): void {
    const key = this.programKey(category);

    if (this.expandedCompletedProgramKeys.has(key)) {
      this.expandedCompletedProgramKeys.delete(key);
      return;
    }

    this.expandedCompletedProgramKeys.add(key);
  }

  private groupTrainings(trainings: Training[]): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    const groups = new Map<string, { category: TrainingCategory | null; trainings: Training[] }>();

    trainings.forEach((training) => {
      const category = training.category ?? null;
      const key = category ? `category-${category.id}` : 'uncategorized';

      if (!groups.has(key)) {
        groups.set(key, { category, trainings: [] });
      }

      groups.get(key)?.trainings.push(training);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (!left.category && !right.category) {
        return 0;
      }

      if (!left.category) {
        return 1;
      }

      if (!right.category) {
        return -1;
      }

      const orderDiff = (left.category.sort_order ?? 0) - (right.category.sort_order ?? 0);
      return orderDiff !== 0 ? orderDiff : left.category.name.localeCompare(right.category.name);
    });
  }
}
