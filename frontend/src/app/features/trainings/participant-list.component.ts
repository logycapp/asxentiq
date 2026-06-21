import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ModalFacadeService } from '../../core/services/modal-facade.service';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingParticipant } from '../../core/services/training.service';
import { ParticipantFormComponent } from './participant-form.component';

@Component({
  selector: 'app-participant-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4 participants-page">
      <div class="page-shell">
        <section class="hero-card">
          <div>
            <p class="hero-eyebrow mb-2">Modulo SST</p>
            <h4 class="hero-title mb-2">Participantes</h4>
            <p class="hero-description mb-0">
              Gestiona las personas que se asignan a capacitaciones y mantienen su seguimiento en un solo lugar.
            </p>
          </div>
          <button class="btn btn-primary btn-lg hero-action" (click)="openCreateModal()">
            <i class="fa-solid fa-user-plus me-2"></i>
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
          <button class="btn btn-primary" (click)="openCreateModal()">
            <i class="fa-solid fa-user-plus me-2"></i>
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
                <i class="fa-solid fa-file-excel me-2"></i>
                {{ importing ? 'Cargando...' : 'Cargar Excel' }}
              </button>
              <button class="btn btn-success btn-lg table-success-action" (click)="downloadReport()" [disabled]="exporting">
                <i class="fa-solid fa-file-arrow-down me-2"></i>
                {{ exporting ? 'Generando...' : 'Descargar Excel' }}
              </button>
            </div>
          </div>
        </section>

        <section *ngIf="!loading && participants.length > 0" class="table-card">
          <div class="table-card-header">
            <div>
              <h5 class="mb-1">Listado</h5>
              <p class="text-muted mb-0">Resumen operativo de participantes registrados.</p>
            </div>
            <span class="table-counter">{{ participants.length }} registros</span>
          </div>

          <div class="table-responsive">
            <table class="table align-middle table-hover mb-0 participant-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cedula</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of participants">
                  <td class="text-muted">#{{ p.id }}</td>
                  <td class="fw-semibold">{{ p.document_number }}</td>
                  <td>{{ p.full_name }}</td>
                  <td>{{ p.email || '-' }}</td>
                  <td>{{ p.phone || '-' }}</td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm action-group">
                      <button class="btn btn-outline-primary" (click)="openEditModal(p)">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button class="btn btn-outline-danger" (click)="remove(p)">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-actions">
            <div class="table-actions-help">
              <strong>Carga masiva:</strong>
              descarga el Excel, complétalo y vuelve a subirlo para crear o actualizar participantes.
            </div>
            <div class="table-actions-buttons">
              <input #participantsFileInput type="file" class="d-none" accept=".xlsx,.xls" (change)="importReport($event)" />
              <button class="btn btn-success btn-lg table-success-action" (click)="participantsFileInput.click()" [disabled]="importing">
                <i class="fa-solid fa-file-excel me-2"></i>
                {{ importing ? 'Cargando...' : 'Cargar Excel' }}
              </button>
              <button class="btn btn-success btn-lg table-success-action" (click)="downloadReport()" [disabled]="exporting">
                <i class="fa-solid fa-file-arrow-down me-2"></i>
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

    .hero-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
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
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.35rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(241, 246, 250, 0.98));
    }

    .table-counter {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: rgba(20, 98, 255, 0.1);
      color: var(--brand-blue);
      font-weight: 700;
      white-space: nowrap;
    }

    .participant-table thead th {
      background: var(--brand-navy);
      color: #e2e8f0;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 0;
      padding-top: 0.95rem;
      padding-bottom: 0.95rem;
    }

    .participant-table tbody td {
      padding-top: 1rem;
      padding-bottom: 1rem;
      border-color: rgba(15, 23, 42, 0.08);
    }

    .action-group .btn {
      box-shadow: none;
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

    @media (max-width: 992px) {
      .hero-card,
      .table-card-header,
      .table-actions {
        flex-direction: column;
        align-items: flex-start;
      }

      .hero-action,
      .table-success-action {
        width: 100%;
      }

      .hero-secondary-action {
        width: 100%;
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
export class ParticipantListComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly modalService = inject(ModalFacadeService);

  participants: TrainingParticipant[] = [];
  loading = true;
  message = '';
  errorMessage = '';
  saving = false;
  exporting = false;
  importing = false;

  ngOnInit(): void {
    this.loadParticipants();
  }

  loadParticipants(): void {
    this.loading = true;
    this.loadingService.track(this.trainingService.getAllParticipants())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => (this.participants = data),
        error: () => (this.errorMessage = 'Error al cargar participantes.')
      });
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
