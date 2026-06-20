import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { ModalFacadeService } from '../../core/services/modal-facade.service';
import {
  Training,
  TrainingListMeta,
  TrainingListSummary,
  TrainingService
} from '../../core/services/training.service';
import { TrainingFormComponent } from './training-form.component';
import { TrainingAssignComponent } from './training-assign.component';
import { TrainingQuestionsComponent } from './training-questions.component';
import { TrainingResultsComponent } from './training-results.component';

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbAlertModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule
  ],
  template: `
    <div class="container-fluid py-4 trainings-page">
      <div class="page-shell">
        <section class="hero-card">
          <div>
            <p class="hero-eyebrow mb-2">Modulo SST</p>
            <h4 class="hero-title mb-2">Capacitaciones</h4>
            <p class="hero-description mb-0">
              Crea, organiza y controla las capacitaciones con una vista mas clara para
              seguimiento rapido.
            </p>
          </div>
          <div class="hero-actions">
            <a routerLink="/trainings/create" class="btn btn-primary btn-lg hero-action">
              <i class="fa-solid fa-plus me-2"></i>
              Nueva capacitacion
            </a>
          </div>
        </section>

        <section class="row g-3 mb-3" *ngIf="!loading">
          <div class="col-12 col-md-4">
            <div class="metric-card metric-card-primary">
              <span class="metric-label">Total</span>
              <span class="metric-value">{{ summary.total }}</span>
              <span class="metric-help">capacitaciones registradas</span>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="metric-card metric-card-warning">
              <span class="metric-label">Programadas</span>
              <span class="metric-value">{{ summary.scheduled }}</span>
              <span class="metric-help">pendientes por ejecutar</span>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="metric-card metric-card-success">
              <span class="metric-label">Realizadas</span>
              <span class="metric-value">{{ summary.completed }}</span>
              <span class="metric-help">cerradas correctamente</span>
            </div>
          </div>
        </section>

        <div *ngIf="message" class="alert alert-success alert-dismissible fade show soft-alert" role="alert">
          {{ message }}
          <button type="button" class="btn-close" (click)="message = ''" aria-label="Close"></button>
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger alert-dismissible fade show soft-alert" role="alert">
          {{ errorMessage }}
          <button type="button" class="btn-close" (click)="errorMessage = ''" aria-label="Close"></button>
        </div>

        <div *ngIf="loading" class="loading-panel text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <div class="loading-text mt-3">Cargando capacitaciones...</div>
        </div>

        <section *ngIf="!loading && trainings.length === 0" class="empty-card text-center">
          <div class="empty-icon">
            <i class="fa-solid fa-file-lines"></i>
          </div>
          <h5 class="mb-2">No hay capacitaciones registradas</h5>
          <p class="text-muted mb-4">
            {{ searchTerm ? 'No hay resultados para esa busqueda.' : 'Crea la primera capacitacion para empezar a gestionar el modulo.' }}
          </p>
          <a routerLink="/trainings/create" class="btn btn-primary">
            <i class="fa-solid fa-plus me-2"></i>
            Nueva capacitacion
          </a>
        </section>

        <section *ngIf="!loading && trainings.length > 0" class="table-card">
          <div class="table-card-header">
            <div>
              <h5 class="mb-1">Listado</h5>
              <p class="text-muted mb-0">Resumen operativo de capacitaciones activas e historicas.</p>
            </div>
            <div class="table-toolbar">
              <span class="table-counter">{{ meta.total }} registros</span>
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Buscar</mat-label>
                <input
                  matInput
                  name="searchTerm"
                  [(ngModel)]="searchTerm"
                  (keyup.enter)="applyFilters()"
                  placeholder="Titulo, estado, tipo..."
                />
                <button
                  *ngIf="searchTerm"
                  matSuffix
                  mat-icon-button
                  type="button"
                  aria-label="Limpiar busqueda"
                  (click)="clearSearch()"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </mat-form-field>
              <button mat-flat-button color="primary" type="button" (click)="applyFilters()">
                <i class="fa-solid fa-magnifying-glass me-2"></i>
                Buscar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table
              mat-table
              [dataSource]="trainings"
              matSort
              [matSortActive]="sortBy"
              [matSortDirection]="sortDir"
              (matSortChange)="onSortChange($event)"
              class="mat-elevation-z0 training-table"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>#</th>
                <td mat-cell *matCellDef="let t" class="text-muted">#{{ t.id }}</td>
              </ng-container>

              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Titulo</th>
                <td mat-cell *matCellDef="let t" class="fw-semibold">{{ t.title }}</td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Tipo</th>
                <td mat-cell *matCellDef="let t">{{ typeLabel(t.type) }}</td>
              </ng-container>

              <ng-container matColumnDef="modality">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Modalidad</th>
                <td mat-cell *matCellDef="let t">{{ modalityLabel(t.modality) }}</td>
              </ng-container>

              <ng-container matColumnDef="scheduled_date">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
                <td mat-cell *matCellDef="let t">{{ t.scheduled_date }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Estado</th>
                <td mat-cell *matCellDef="let t">
                  <span [class]="'status-pill ' + statusClass(t.status)">
                    {{ statusLabel(t.status) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="questions_count">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Preguntas</th>
                <td mat-cell *matCellDef="let t">
                  <span class="count-pill">{{ t.questions_count ?? 0 }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="users_count">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Usuarios</th>
                <td mat-cell *matCellDef="let t">
                  <span class="count-pill">{{ t.users_count ?? 0 }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="text-end">Acciones</th>
                <td mat-cell *matCellDef="let t" class="text-end">
                  <div class="btn-group btn-group-sm action-group">
                    <button type="button" class="btn btn-outline-primary" title="Editar" (click)="openEditModal(t)">
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="btn btn-outline-info" title="Preguntas" (click)="openQuestionsModal(t)">
                      <i class="fa-solid fa-circle-question"></i>
                    </button>
                    <button type="button" class="btn btn-outline-success" title="Asignar usuarios" (click)="openAssignModal(t)">
                      <i class="fa-solid fa-user-plus"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" title="Resultados" (click)="openResultsModal(t)">
                      <i class="fa-solid fa-chart-column"></i>
                    </button>
                    <button class="btn btn-outline-danger" (click)="remove(t)" title="Eliminar">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="meta.total"
            [pageIndex]="meta.current_page - 1"
            [pageSize]="meta.per_page"
            [pageSizeOptions]="pageSizeOptions"
            [showFirstLastButtons]="true"
            (page)="onPageChange($event)">
          </mat-paginator>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --brand-navy: #08162f;
      --brand-blue: #1462ff;
      --brand-cyan: #1dbbd6;
      --brand-teal: #2fd0b0;
      --brand-green: #42d483;
      --brand-ink: #0f172a;
      --brand-muted: #5b6b84;
    }

    .trainings-page {
      background:
        radial-gradient(circle at top left, rgba(20, 98, 255, 0.13), transparent 30%),
        radial-gradient(circle at top right, rgba(29, 187, 214, 0.12), transparent 24%),
        radial-gradient(circle at 50% 110%, rgba(66, 212, 131, 0.1), transparent 30%),
        linear-gradient(180deg, #f8fbff 0%, #edf3f8 100%);
      min-height: 100%;
    }

    .page-shell {
      max-width: 1400px;
      margin: 0 auto;
    }

    .hero-card,
    .table-card,
    .empty-card,
    .metric-card,
    .loading-panel {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1.25rem;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(10px);
    }

    .hero-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      margin-bottom: 1rem;
      background:
        linear-gradient(135deg, rgba(20, 98, 255, 0.11), rgba(29, 187, 214, 0.08), rgba(255, 255, 255, 0.97)),
        rgba(255, 255, 255, 0.92);
      border-top: 4px solid var(--brand-blue);
    }

    .hero-eyebrow {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--brand-cyan);
    }

    .hero-title {
      font-size: 1.7rem;
      font-weight: 800;
      color: var(--brand-ink);
    }

    .hero-description {
      color: var(--brand-muted);
      max-width: 760px;
    }

    .hero-action {
      white-space: nowrap;
      border-radius: 999px;
      border: 0;
      background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan));
      box-shadow: 0 12px 26px rgba(20, 98, 255, 0.26);
    }

    .metric-card {
      padding: 1.15rem 1.25rem;
      height: 100%;
      border-top: 4px solid transparent;
    }

    .metric-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--brand-muted);
      margin-bottom: 0.35rem;
    }

    .metric-value {
      display: block;
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
      color: var(--brand-ink);
    }

    .metric-help {
      display: block;
      margin-top: 0.35rem;
      color: var(--brand-muted);
      font-size: 0.92rem;
    }

    .metric-card-primary {
      background: linear-gradient(135deg, rgba(20, 98, 255, 0.13), rgba(255, 255, 255, 0.97));
      border-top-color: var(--brand-blue);
    }

    .metric-card-warning {
      background: linear-gradient(135deg, rgba(29, 187, 214, 0.16), rgba(255, 255, 255, 0.97));
      border-top-color: var(--brand-cyan);
    }

    .metric-card-success {
      background: linear-gradient(135deg, rgba(66, 212, 131, 0.16), rgba(255, 255, 255, 0.97));
      border-top-color: var(--brand-green);
    }

    .soft-alert {
      border-radius: 1rem;
    }

    .loading-panel {
      padding: 3rem 1rem;
    }

    .loading-text {
      color: var(--brand-muted);
      font-weight: 600;
    }

    .empty-card {
      padding: 3.25rem 1.5rem;
    }

    .empty-icon {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, rgba(20, 98, 255, 0.12), rgba(29, 187, 214, 0.12));
      color: var(--brand-blue);
      font-size: 1.75rem;
    }

    .table-card {
      overflow: hidden;
      border-top: 4px solid var(--brand-cyan);
    }

    .table-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.35rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(241, 246, 250, 0.98));
    }

    .table-toolbar {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex-wrap: nowrap;
      justify-content: flex-end;
      width: 100%;
    }

    .table-counter {
      display: inline-flex;
      align-items: center;
      padding: 0.55rem 0.8rem;
      border-radius: 999px;
      background: rgba(20, 98, 255, 0.1);
      color: var(--brand-blue);
      font-weight: 700;
      white-space: nowrap;
      height: 56px;
      flex: 0 0 auto;
    }

    .search-field {
      width: min(19rem, 100%);
      flex: 0 1 19rem;
    }

    .search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .search-field ::ng-deep .mat-mdc-text-field-wrapper {
      background: #fff;
      border-radius: 16px;
    }

    .search-field ::ng-deep .mat-mdc-form-field-flex {
      min-height: 56px;
      align-items: center;
    }

    .search-field ::ng-deep .mat-mdc-form-field-infix {
      padding-top: 0.9rem;
      padding-bottom: 0.9rem;
      min-height: 56px;
    }

    .search-field ::ng-deep .mat-mdc-icon-button {
      width: 40px;
      height: 40px;
      padding: 0;
    }

    .training-table {
      width: 100%;
      background: #fff;
    }

    .training-table ::ng-deep .mat-mdc-header-row {
      background: #e4e4e4ff;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }
      

    .training-table ::ng-deep .mat-mdc-header-cell {
      background: transparent;
      color: var(--brand-ink);
      border-bottom-color: rgba(15, 23, 42, 0.08);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
    }

    .training-table ::ng-deep .mat-sort-header-arrow {
      color: var(--brand-blue);
    }

    .training-table ::ng-deep .mat-mdc-row:hover {
      background: rgba(20, 98, 255, 0.035);
    }

    .training-table ::ng-deep .mat-mdc-cell,
    .training-table ::ng-deep .mat-mdc-header-cell {
      padding-left: 0.85rem;
      padding-right: 0.85rem;
      border-bottom-color: rgba(15, 23, 42, 0.08);
    }

    .training-table ::ng-deep .mat-mdc-cell {
      padding-top: 1rem;
      padding-bottom: 1rem;
    }

    .status-pill,
    .count-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 5.5rem;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .count-pill {
      background: rgba(15, 23, 42, 0.06);
      color: var(--brand-ink);
      min-width: 3rem;
    }

    .status-scheduled {
      background: rgba(20, 98, 255, 0.12);
      color: var(--brand-blue);
    }

    .status-completed {
      background: rgba(66, 212, 131, 0.15);
      color: #11875b;
    }

    .status-cancelled {
      background: rgba(29, 187, 214, 0.14);
      color: #b02a37;
    }

    .action-group .btn {
      box-shadow: none;
    }

    @media (max-width: 992px) {
      .hero-card,
      .table-card-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .hero-action {
        width: 100%;
      }

      .table-toolbar {
        width: 100%;
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .search-field {
        width: 100%;
        flex: 1 1 100%;
      }
    }

    @media (max-width: 575.98px) {
      .table-toolbar {
        gap: 0.5rem;
      }

      .table-counter {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class TrainingListComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly modalService = inject(ModalFacadeService);

  trainings: Training[] = [];
  displayedColumns = ['id', 'title', 'type', 'modality', 'scheduled_date', 'status', 'questions_count', 'users_count', 'actions'];
  pageSizeOptions = [5, 10, 25, 50];
  searchTerm = '';
  sortBy = 'scheduled_date';
  sortDir: 'asc' | 'desc' = 'desc';
  meta: TrainingListMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null
  };
  summary: TrainingListSummary = {
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  };
  loading = false;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadTrainings();
  }

  loadTrainings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(
      this.trainingService.list({
        page: this.meta.current_page,
        per_page: this.meta.per_page,
        search: this.searchTerm || undefined,
        sort_by: this.sortBy,
        sort_dir: this.sortDir
      })
    )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.trainings = response.data;
          this.meta = response.meta;
          this.summary = response.summary;
        },
        error: () => (this.errorMessage = 'No fue posible cargar las capacitaciones.')
      });
  }

  applyFilters(): void {
    this.meta = { ...this.meta, current_page: 1 };
    this.loadTrainings();
  }

  clearSearch(): void {
    if (!this.searchTerm) {
      return;
    }

    this.searchTerm = '';
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.meta = {
      ...this.meta,
      current_page: event.pageIndex + 1,
      per_page: event.pageSize
    };
    this.loadTrainings();
  }

  onSortChange(sort: Sort): void {
    this.sortBy = sort.active || 'scheduled_date';
    this.sortDir = (sort.direction || 'desc') as 'asc' | 'desc';
    this.meta = { ...this.meta, current_page: 1 };
    this.loadTrainings();
  }

  remove(training: Training): void {
    const confirmed = window.confirm(`Eliminar "${training.title}"?`);
    if (!confirmed) return;

    this.loadingService.track(this.trainingService.delete(training.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadTrainings();
      },
      error: () => (this.errorMessage = 'Error al eliminar la capacitacion.')
    });
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

  modalityLabel(modality: string): string {
    const labels: Record<string, string> = {
      presential: 'Presencial',
      virtual: 'Virtual',
      mixed: 'Mixto'
    };
    return labels[modality] || modality;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Programada',
      completed: 'Realizada',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      scheduled: 'status-scheduled',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return classes[status] || 'status-scheduled';
  }

  countByStatus(status: string): number {
    const trainings = Array.isArray(this.trainings) ? this.trainings : [];
    return trainings.filter((training) => training.status === status).length;
  }

  openEditModal(training: Training): void {
    const modalRef = this.modalService.open(TrainingFormComponent);

    modalRef.componentInstance.trainingIdInput = training.id;
    modalRef.componentInstance.saved.subscribe(() => this.loadTrainings());
  }

  openQuestionsModal(training: Training): void {
    const modalRef = this.modalService.open(TrainingQuestionsComponent);

    modalRef.componentInstance.trainingIdInput = training.id;
    modalRef.componentInstance.trainingTitleInput = training.title;
    modalRef.componentInstance.saved.subscribe(() => this.loadTrainings());
  }

  openAssignModal(training: Training): void {
    const modalRef = this.modalService.open(TrainingAssignComponent);

    modalRef.componentInstance.trainingIdInput = training.id;
    modalRef.componentInstance.trainingTitleInput = training.title;
    modalRef.componentInstance.saved.subscribe(() => this.loadTrainings());
  }

  openResultsModal(training: Training): void {
    const modalRef = this.modalService.open(TrainingResultsComponent);

    modalRef.componentInstance.trainingIdInput = training.id;
  }
}
