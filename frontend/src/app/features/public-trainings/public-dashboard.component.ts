import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Training, PublicUser } from '../../core/services/training.service';

@Component({
  selector: 'app-public-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbAlertModule],
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

        <div *ngFor="let t of pending" class="card mb-2">
          <div class="card-body d-flex justify-content-between align-items-center">
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

      <!-- Completed -->
      <div *ngIf="tab === 'completed'">
        <div *ngIf="completed.length === 0" class="text-muted py-4 text-center">
          No has completado ninguna capacitacion.
        </div>

        <div *ngFor="let t of completed" class="card mb-2">
          <div class="card-body">
            <div class="d-flex justify-content-between">
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
}
