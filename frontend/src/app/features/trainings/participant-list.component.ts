import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ModalFacadeService } from '../../core/services/modal-facade.service';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingParticipant } from '../../core/services/training.service';
import { ParticipantFormComponent } from './participant-form.component';

@Component({
  selector: 'app-participant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule
  ],
  template: `
    <div class="container-fluid py-4 participants-page">
      <div class="participants-shell">
        <section class="participants-hero">
          <div class="participants-hero__copy">
            <p class="participants-eyebrow mb-2">Modulo de seguridad</p>
            <h1 class="participants-title mb-3">Participantes</h1>
            <p class="participants-description mb-0">
              Gestiona las personas que se asignan a capacitaciones y mantienen su seguimiento en un solo lugar.
            </p>
          </div>
          <button class="btn btn-primary btn-lg participants-cta" (click)="openCreateModal()">
            <i class="fa-solid fa-user-plus participants-cta__icon" aria-hidden="true"></i>
            Nuevo participante
          </button>
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
          <div class="spinner-border text-primary" role="status"></div>
          <div class="loading-text mt-3">Cargando participantes...</div>
        </div>

        <section *ngIf="!loading && participants.length === 0" class="empty-card text-center">
          <div class="empty-icon">
            <i class="fa-solid fa-users"></i>
          </div>
          <h5 class="mb-2">No hay participantes registrados</h5>
          <p class="text-muted mb-4">Crea el primer participante para empezar a asociarlo a capacitaciones.</p>
          <button class="btn btn-primary participants-cta participants-cta--compact" (click)="openCreateModal()">
            <i class="fa-solid fa-user-plus participants-cta__icon" aria-hidden="true"></i>
            Nuevo participante
          </button>
          <div class="table-actions empty-actions mt-4">
            <div class="table-actions-help text-start">
              <strong>Carga masiva:</strong>
              descarga el Excel, complétalo y vuelve a subirlo para crear o actualizar participantes.
            </div>
            <div class="table-actions-buttons">
              <input #emptyParticipantsFileInput type="file" class="d-none" accept=".xlsx,.xls" (change)="importReport($event)" />
              <button class="btn btn-success btn-lg table-success-action" (click)="emptyParticipantsFileInput.click()" [disabled]="importing">
                <i class="fa-solid fa-file-excel participants-action-icon" aria-hidden="true"></i>
                {{ importing ? 'Cargando...' : 'Cargar Excel' }}
              </button>
              <button class="btn btn-success btn-lg table-success-action" (click)="downloadReport()" [disabled]="exporting">
                <i class="fa-solid fa-file-arrow-down participants-action-icon" aria-hidden="true"></i>
                {{ exporting ? 'Generando...' : 'Descargar Excel' }}
              </button>
            </div>
          </div>
        </section>

        <section *ngIf="!loading && participants.length > 0" class="table-card">
          <div class="table-card-header">
            <div class="table-card-header__copy">
              <h2 class="table-title mb-2">Listado Maestro</h2>
              <p class="table-subtitle mb-0">{{ totalParticipants }} registros activos en la base de datos</p>
            </div>
            <div class="table-toolbar">
              <div class="search-shell">
                <i class="fa-solid fa-magnifying-glass search-shell__icon" aria-hidden="true"></i>
                <input
                  class="search-shell__input"
                  name="searchTerm"
                  [(ngModel)]="searchTerm"
                  (keyup.enter)="applyFilters()"
                  placeholder="Filtrar por cédula, nombre, email o teléfono..."
                  aria-label="Filtrar participantes"
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
              <button type="button" class="btn btn-dark participants-filter-btn" (click)="applyFilters()">
                Filtrar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table
              mat-table
              [dataSource]="dataSource"
              matSort
              (matSortChange)="onSortChange($event)"
              class="mat-elevation-z0 participant-table"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>#</th>
                <td mat-cell *matCellDef="let p" class="text-muted">#{{ p.id }}</td>
              </ng-container>

              <ng-container matColumnDef="document_number">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Cedula</th>
                <td mat-cell *matCellDef="let p" class="fw-semibold">{{ p.document_number }}</td>
              </ng-container>

              <ng-container matColumnDef="full_name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
                <td mat-cell *matCellDef="let p">{{ p.full_name }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
                <td mat-cell *matCellDef="let p">{{ p.email || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Telefono</th>
                <td mat-cell *matCellDef="let p">{{ p.phone || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="text-end">Acciones</th>
                <td mat-cell *matCellDef="let p" class="text-end">
                  <div class="action-group">
                    <button class="action-btn action-btn--edit" (click)="openEditModal(p)" title="Editar">
                      <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn action-btn--delete" (click)="remove(p)" title="Eliminar">
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
            [length]="filteredParticipantsCount"
            [pageSize]="pageSize"
            [pageSizeOptions]="pageSizeOptions"
            [showFirstLastButtons]="true"
            (page)="onPageChange($event)">
          </mat-paginator>

          <div class="table-actions">
            <div class="table-actions-help">
              <strong>Carga masiva:</strong>
              descarga el Excel, complétalo y vuelve a subirlo para crear o actualizar participantes.
            </div>
            <div class="table-actions-buttons">
              <input #participantsFileInput type="file" class="d-none" accept=".xlsx,.xls" (change)="importReport($event)" />
              <button class="btn btn-success btn-lg table-success-action" (click)="participantsFileInput.click()" [disabled]="importing">
                <i class="fa-solid fa-file-excel participants-action-icon" aria-hidden="true"></i>
                {{ importing ? 'Cargando...' : 'Cargar Excel' }}
              </button>
              <button class="btn btn-success btn-lg table-success-action" (click)="downloadReport()" [disabled]="exporting">
                <i class="fa-solid fa-file-arrow-down participants-action-icon" aria-hidden="true"></i>
                {{ exporting ? 'Generando...' : 'Descargar Excel' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --brand-navy: #08162f;
      --brand-blue: #1462ff;
      --brand-cyan: #1dbbd6;
      --brand-green: #42d483;
      --brand-ink: #0f172a;
      --brand-muted: #5b6b84;
    }

    .participants-page {
      background:
        radial-gradient(circle at top left, rgba(20, 98, 255, 0.13), transparent 30%),
        radial-gradient(circle at top right, rgba(29, 187, 214, 0.12), transparent 24%),
        radial-gradient(circle at 50% 110%, rgba(66, 212, 131, 0.1), transparent 30%),
        linear-gradient(180deg, #f8fbff 0%, #edf3f8 100%);
      min-height: 100%;
    }

    .participants-shell {
      width: 100%;
      max-width: none;
      margin: 0 auto;
    }

    .participants-hero,
    .table-card,
    .empty-card,
    .loading-panel {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 32px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(12px);
    }

    .participants-hero {
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

    .participants-hero__copy {
      min-width: 0;
    }

    .participants-eyebrow {
      color: var(--brand-blue);
      font-size: 0.9rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.22em;
    }

    .participants-title {
      margin: 0;
      font-size: clamp(2rem, 3vw, 3rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      color: var(--brand-ink);
    }

    .participants-description {
      color: var(--brand-muted);
      max-width: 700px;
      font-size: 1.06rem;
      line-height: 1.6;
    }

    .participants-cta {
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

    .participants-cta__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      font-size: 1.05rem;
      line-height: 1;
      flex: 0 0 auto;
    }

    .participants-cta--compact {
      min-width: 0;
      min-height: 56px;
      padding-inline: 1.2rem;
      border-radius: 18px;
      font-size: 0.98rem;
    }

    .participants-action-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      margin-right: 0.6rem;
      line-height: 1;
    }

    .table-card {
      overflow: hidden;
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

    .table-counter {
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

    .participants-filter-btn {
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

    .participant-table {
      width: 100%;
      background: #fff;
    }

    .participant-table ::ng-deep .mat-mdc-header-row {
      background: #f1f3f6;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }

    .participant-table ::ng-deep .mat-mdc-header-cell {
      background: transparent;
      color: var(--brand-ink);
      border-bottom-color: rgba(15, 23, 42, 0.08);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-weight: 800;
      padding-top: 0.95rem;
      padding-bottom: 0.95rem;
    }

    .participant-table ::ng-deep .mat-mdc-cell {
      padding-top: 1rem;
      padding-bottom: 1rem;
      border-bottom-color: rgba(15, 23, 42, 0.08);
    }

    .participant-table ::ng-deep .mat-mdc-cell,
    .participant-table ::ng-deep .mat-mdc-header-cell {
      padding-left: 0.9rem;
      padding-right: 0.9rem;
    }

    .participant-table ::ng-deep .mat-mdc-row:hover {
      background: rgba(35, 73, 168, 0.03);
    }

    .participant-table ::ng-deep .mat-sort-header-arrow {
      color: var(--brand-blue);
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

    .action-btn--delete {
      background: linear-gradient(135deg, #ee5d5d, #d63d3d);
    }

    .table-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.35rem 1.25rem;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      background: linear-gradient(180deg, rgba(247, 255, 250, 0.98), rgba(241, 251, 244, 0.98));
    }

    .table-actions-help {
      color: var(--brand-muted);
      max-width: 700px;
    }

    .table-actions-help strong {
      color: #157347;
    }

    .table-actions-buttons {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .table-success-action {
      white-space: nowrap;
      border-radius: 999px;
      box-shadow: 0 12px 26px rgba(25, 135, 84, 0.18);
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

    @media (max-width: 992px) {
      .table-card-header,
      .table-actions {
        flex-direction: column;
        align-items: flex-start;
      }

      .table-toolbar {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }

      .participants-hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .participants-cta,
      .table-success-action {
        width: 100%;
        min-width: 0;
      }

      .participants-filter-btn {
        width: 100%;
      }

      .table-actions-buttons {
        width: 100%;
        justify-content: flex-start;
      }

      .participant-form-actions {
        flex-direction: column;
      }

      .participant-form-actions .btn {
        width: 100%;
      }
    }
  `]
})
export class ParticipantListComponent implements OnInit, AfterViewInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly modalService = inject(ModalFacadeService);

  displayedColumns = ['id', 'document_number', 'full_name', 'email', 'phone', 'actions'];
  pageSizeOptions = [5, 10, 25, 50];
  pageSize = 10;
  searchTerm = '';
  participants: TrainingParticipant[] = [];
  dataSource = new MatTableDataSource<TrainingParticipant>([]);
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;
  loading = true;
  message = '';
  errorMessage = '';
  saving = false;
  exporting = false;
  importing = false;

  get totalParticipants(): number {
    return this.participants.length;
  }

  get filteredParticipantsCount(): number {
    return this.dataSource.filteredData.length;
  }

  ngOnInit(): void {
    this.loadParticipants();
  }

  loadParticipants(): void {
    this.loading = true;
    this.loadingService.track(this.trainingService.getAllParticipants())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.participants = data;
          this.dataSource.data = [...data];
          this.applyTableFilter();
        },
        error: () => (this.errorMessage = 'Error al cargar participantes.')
      });
  }

  ngAfterViewInit(): void {
    this.configureTable();
    this.applyTableFilter();
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(ParticipantFormComponent);
    modalRef.componentInstance.saved.subscribe(() => this.refreshAfterSave());
  }

  openEditModal(participant: TrainingParticipant): void {
    const modalRef = this.modalService.open(ParticipantFormComponent);
    modalRef.componentInstance.participantInput = participant;
    modalRef.componentInstance.saved.subscribe(() => this.refreshAfterSave());
  }

  refreshAfterSave(): void {
    this.message = 'Participante guardado correctamente.';
    this.loadParticipants();
  }

  applyFilters(): void {
    this.applyTableFilter();
  }

  clearSearch(): void {
    if (!this.searchTerm) {
      return;
    }

    this.searchTerm = '';
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
  }

  onSortChange(sort: Sort): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  private configureTable(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'id':
          return item.id;
        case 'document_number':
          return item.document_number ?? '';
        case 'full_name':
          return item.full_name ?? '';
        case 'email':
          return item.email ?? '';
        case 'phone':
          return item.phone ?? '';
        default:
          return '';
      }
    };

    this.dataSource.filterPredicate = (item, filter) => {
      const term = filter.trim().toLowerCase();

      if (!term) {
        return true;
      }

      return [
        item.document_number,
        item.full_name,
        item.email || '',
        item.phone || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    };

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.pageSize = this.pageSize;
    }
  }

  private applyTableFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  downloadReport(): void {
    if (this.exporting) {
      return;
    }

    this.errorMessage = '';
    this.exporting = true;

    this.loadingService.track(this.trainingService.downloadParticipantsReport())
      .pipe(finalize(() => (this.exporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'reporte-participantes.xlsx';
          link.click();
          window.URL.revokeObjectURL(url);
          this.message = 'Reporte Excel descargado correctamente.';
        },
        error: () => (this.errorMessage = 'Error al descargar el reporte Excel.')
      });
  }

  importReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.importing) {
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.importing = true;

    this.loadingService.track(this.trainingService.importParticipantsReport(file))
      .pipe(finalize(() => {
        this.importing = false;
        input.value = '';
      }))
      .subscribe({
        next: (result) => {
          this.message = `Carga procesada: ${result.created} creados, ${result.updated} actualizados y ${result.skipped} omitidos.`;
          if (result.errors.length > 0) {
            this.errorMessage = `Se omitieron ${result.skipped} filas por errores de validación.`;
          }
          this.loadParticipants();
        },
        error: () => (this.errorMessage = 'Error al cargar el Excel de participantes.')
      });
  }

  remove(p: TrainingParticipant): void {
    if (!window.confirm(`Eliminar a ${p.full_name}?`)) return;
    this.loadingService.track(this.trainingService.deleteParticipant(p.id)).subscribe({
      next: (res) => {
        this.message = res.message;
        this.loadParticipants();
      },
      error: () => (this.errorMessage = 'Error al eliminar.')
    });
  }
}
