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
      <div class="trainings-shell">
        <section class="trainings-hero">
          <div class="trainings-hero__copy">
            <p class="trainings-eyebrow mb-2">Modulo de seguridad</p>
            <h1 class="trainings-title mb-3">Capacitaciones SST</h1>
            <p class="trainings-description mb-0">
              Gestiona, monitorea y certifica el crecimiento profesional de tus colaboradores
              con una vista clara para seguimiento rapido.
            </p>
          </div>

          <a routerLink="/trainings/create" class="btn btn-primary btn-lg trainings-cta">
            <i class="fa-solid fa-plus trainings-cta__icon" aria-hidden="true"></i>
            Nueva capacitacion
          </a>
        </section>

        <section class="row g-3 mb-4" *ngIf="!loading">
          <div class="col-12 col-lg-4">
            <div class="metric-card metric-card-primary">
              <div class="metric-card__top">
                <span class="metric-icon metric-icon--primary">
                  <i class="fa-solid fa-layer-group"></i>
                </span>
                <span class="metric-badge">Acumulado</span>
              </div>
              <span class="metric-value">{{ summary.total }}</span>
              <span class="metric-help">Capacitaciones totales</span>
            </div>
          </div>
          <div class="col-12 col-lg-4">
            <div class="metric-card metric-card-warning">
              <div class="metric-card__top">
                <span class="metric-icon metric-icon--warning">
                  <i class="fa-solid fa-calendar" aria-hidden="true"></i>
                </span>
                <span class="metric-badge">Próximas</span>
              </div>
              <span class="metric-value">{{ summary.scheduled }}</span>
              <span class="metric-help">Pendientes por ejecutar</span>
            </div>
          </div>
          <div class="col-12 col-lg-4">
            <div class="metric-card metric-card-success">
              <div class="metric-card__top">
                <span class="metric-icon metric-icon--success">
                  <i class="fa-solid fa-circle-check"></i>
                </span>
                <span class="metric-badge">Completado</span>
              </div>
              <span class="metric-value">{{ summary.completed }}</span>
              <span class="metric-help">Cerradas exitosamente</span>
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
            <div class="table-card-header__copy">
              <h2 class="table-title mb-2">Listado Maestro</h2>
              <p class="table-subtitle mb-0">{{ meta.total }} registros activos en la base de datos</p>
            </div>
            <div class="table-toolbar">
              <div class="search-shell">
                <i class="fa-solid fa-magnifying-glass search-shell__icon" aria-hidden="true"></i>
                <input
                  class="search-shell__input"
                  name="searchTerm"
                  [(ngModel)]="searchTerm"
                  (keyup.enter)="applyFilters()"
                  placeholder="Filtrar por titulo, tipo o fecha..."
                  aria-label="Filtrar capacitaciones"
                />
                <button
                  *ngIf="searchTerm"
                  type="button"
                  class="search-shell__clear"
                  aria-label="Limpiar busqueda"
                  (click)="clearSearch()"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <button type="button" class="btn btn-dark trainings-filter-btn" (click)="applyFilters()">
                Filtrar
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
                  <div class="action-group">
                    <button type="button" class="action-btn action-btn--edit" title="Editar" (click)="openEditModal(t)">
                      <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="action-btn action-btn--questions" title="Preguntas" (click)="openQuestionsModal(t)">
                      <i class="fa-solid fa-circle-question" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="action-btn action-btn--assign" title="Asignar usuarios" (click)="openAssignModal(t)">
                      <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="action-btn action-btn--results" title="Resultados" (click)="openResultsModal(t)">
                      <i class="fa-solid fa-chart-column" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="action-btn action-btn--delete" (click)="remove(t)" title="Eliminar">
                      <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
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
      --brand-navy: #071632;
      --brand-blue: #2349a8;
      --brand-cyan: #4f83e8;
      --brand-green: #3f6f15;
      --brand-ink: #1d2430;
      --brand-muted: #5d6375;
      display: block;
    }

    .trainings-page {
      min-height: 100%;
      background:
        radial-gradient(circle at top left, rgba(35, 73, 168, 0.12), transparent 28%),
        radial-gradient(circle at top right, rgba(79, 131, 232, 0.14), transparent 26%),
        linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%);
    }

    .trainings-shell {
      width: 100%;
      max-width: none;
      margin: 0 auto;
    }

    .trainings-hero,
    .metric-card,
    .table-card,
    .empty-card,
    .loading-panel {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 32px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(12px);
    }

    .trainings-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      padding: 2rem 2.25rem;
      margin-bottom: 1.5rem;
      background:
        radial-gradient(circle at top right, rgba(79, 131, 232, 0.16), transparent 26%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 255, 0.92));
    }

    .trainings-eyebrow {
      color: var(--brand-blue);
      font-size: 0.9rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.22em;
    }

    .trainings-title {
      margin: 0;
      font-size: clamp(2rem, 3vw, 3rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      color: var(--brand-ink);
    }

    .trainings-description {
      max-width: 700px;
      color: var(--brand-muted);
      font-size: 1.06rem;
      line-height: 1.6;
    }

    .trainings-cta {
      flex: 0 0 auto;
      min-width: 320px;
      min-height: 72px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      border: 0;
      border-radius: 22px;
      font-size: 1.05rem;
      font-weight: 800;
      background: linear-gradient(135deg, #2349a8, #2f4ea4 55%, #1f78d6);
      box-shadow: 0 20px 35px rgba(35, 73, 168, 0.28);
    }

    .trainings-cta__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      font-size: 1.05rem;
      line-height: 1;
      flex: 0 0 auto;
    }

    .metric-card {
      position: relative;
      height: 100%;
      min-height: 170px;
      padding: 1rem 1.2rem 1.05rem;
      overflow: hidden;
    }

    .metric-card::after {
      content: '';
      position: absolute;
      inset: auto -10% -40% auto;
      width: 11rem;
      height: 11rem;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.25), transparent 68%);
      pointer-events: none;
    }

    .metric-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.7rem;
      position: relative;
      z-index: 1;
    }

    .metric-icon {
      width: 58px;
      height: 58px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 17px;
      font-size: 1.05rem;
      color: #fff;
      box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
    }

    .metric-icon i,
    .action-btn i,
    .trainings-cta__icon {
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon--primary {
      background: linear-gradient(135deg, #2349a8, #2b55c8);
    }

    .metric-icon--warning {
      background: linear-gradient(135deg, #3e77d8, #5b90ea);
    }

    .metric-icon--success {
      background: linear-gradient(135deg, #4b7716, #2f5d0f);
    }

    .metric-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.42rem 0.9rem;
      border-radius: 999px;
      background: #eef0f5;
      color: #505664;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .metric-value {
      display: block;
      margin-top: 0.2rem;
      font-size: 3rem;
      line-height: 0.95;
      font-weight: 700;
      color: var(--brand-ink);
      position: relative;
      z-index: 1;
    }

    .metric-help {
      display: block;
      margin-top: 0.2rem;
      font-size: 0.98rem;
      color: #4d5566;
      position: relative;
      z-index: 1;
    }

    .metric-card-primary {
      background: linear-gradient(135deg, rgba(35, 73, 168, 0.07), rgba(255, 255, 255, 0.98));
    }

    .metric-card-warning {
      background: linear-gradient(135deg, rgba(79, 131, 232, 0.12), rgba(255, 255, 255, 0.98));
    }

    .metric-card-success {
      background: linear-gradient(135deg, rgba(75, 119, 22, 0.12), rgba(255, 255, 255, 0.98));
    }

    .soft-alert {
      border-radius: 20px;
    }

    .loading-panel {
      padding: 3rem 1rem;
    }

    .loading-text {
      color: var(--brand-muted);
      font-weight: 700;
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
      background: linear-gradient(135deg, rgba(35, 73, 168, 0.12), rgba(79, 131, 232, 0.12));
      color: var(--brand-blue);
      font-size: 1.75rem;
    }

    .table-card {
      overflow: hidden;
      border-radius: 34px;
    }

    .table-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.65rem 1.8rem 1.45rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 252, 0.98));
    }

    .table-card-header__copy {
      min-width: 0;
    }

    .table-title {
      margin: 0;
      font-size: clamp(1.7rem, 2vw, 2.05rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      color: var(--brand-ink);
    }

    .table-subtitle {
      color: var(--brand-muted);
      font-size: 1rem;
    }

    .table-toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: flex-end;
      flex: 1 1 auto;
      min-width: 0;
    }

    .search-shell {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex: 1 1 500px;
      max-width: 500px;
      min-width: 0;
      padding: 0.2rem 0.2rem 0.2rem 1rem;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 22px;
      background: #fff;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .search-shell__icon {
      color: #6b7280;
      font-size: 1rem;
    }

    .search-shell__input {
      width: 100%;
      min-width: 0;
      border: 0;
      outline: none;
      background: transparent;
      color: var(--brand-ink);
      font-size: 1rem;
      padding: 1rem 0;
    }

    .search-shell__input::placeholder {
      color: #a7afbf;
    }

    .search-shell__clear {
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.06);
      color: #6b7280;
      flex: 0 0 auto;
    }

    .trainings-filter-btn {
      min-width: 138px;
      min-height: 66px;
      padding-inline: 1.5rem;
      border-radius: 20px;
      font-size: 1rem;
      font-weight: 800;
      background: #1f2328;
      border-color: #1f2328;
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.18);
    }

    .training-table {
      width: 100%;
      background: #fff;
    }

    .training-table ::ng-deep .mat-mdc-header-row {
      background: #f1f3f6;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }

    .training-table ::ng-deep .mat-mdc-header-cell {
      background: transparent;
      color: var(--brand-ink);
      border-bottom-color: rgba(15, 23, 42, 0.08);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-weight: 800;
    }

    .training-table ::ng-deep .mat-sort-header-arrow {
      color: var(--brand-blue);
    }

    .training-table ::ng-deep .mat-mdc-row:hover {
      background: rgba(35, 73, 168, 0.03);
    }

    .training-table ::ng-deep .mat-mdc-cell,
    .training-table ::ng-deep .mat-mdc-header-cell {
      padding-left: 0.9rem;
      padding-right: 0.9rem;
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
      padding: 0.42rem 0.8rem;
      border-radius: 999px;
      font-size: 0.84rem;
      font-weight: 800;
    }

    .count-pill {
      min-width: 3rem;
      background: rgba(15, 23, 42, 0.06);
      color: var(--brand-ink);
    }

    .status-scheduled {
      background: rgba(35, 73, 168, 0.12);
      color: var(--brand-blue);
    }

    .status-completed {
      background: rgba(63, 111, 21, 0.14);
      color: #31610f;
    }

    .status-cancelled {
      background: rgba(239, 68, 68, 0.14);
      color: #b42318;
    }

    .action-group .btn {
      box-shadow: none;
    }

    .action-group {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.4rem;
      flex-wrap: nowrap;
    }

    .action-btn {
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 13px;
      color: #fff;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
      transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
    }

    .action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 22px rgba(15, 23, 42, 0.16);
      filter: brightness(1.02);
    }

    .action-btn--edit {
      background: linear-gradient(135deg, #3657d4, #2b4ebd);
    }

    .action-btn--questions {
      background: linear-gradient(135deg, #3d84e8, #2f6fd3);
    }

    .action-btn--assign {
      background: linear-gradient(135deg, #3f8e57, #2f7747);
    }

    .action-btn--results {
      background: linear-gradient(135deg, #6b7280, #4b5563);
    }

    .action-btn--delete {
      background: linear-gradient(135deg, #ee5d5d, #d63d3d);
    }

    @media (max-width: 1199.98px) {
      .trainings-hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .trainings-cta {
        width: 100%;
        min-width: 0;
      }

      .action-group {
        justify-content: flex-end;
      }
    }

    @media (max-width: 991.98px) {
      .table-card-header {
        flex-direction: column;
        align-items: stretch;
      }

      .table-toolbar {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }

      .search-shell {
        max-width: none;
        flex-basis: auto;
      }

      .trainings-filter-btn {
        width: 100%;
      }
    }

    @media (max-width: 575.98px) {
      .trainings-page {
        padding-left: 0.6rem;
        padding-right: 0.6rem;
      }

      .trainings-hero,
      .table-card-header {
        padding: 1.25rem;
      }

      .metric-card {
        min-height: 152px;
        padding: 0.95rem 1rem 1rem;
      }

      .metric-value {
        font-size: 2.5rem;
      }

      .metric-help {
        font-size: 0.92rem;
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
