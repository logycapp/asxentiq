import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingParticipant, TrainingService } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-assign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent],
  template: `
    <app-page-header
      title="Participantes de capacitación"
      [subtitle]="'Administra los participantes de ' + trainingTitle + ' desde esta pantalla.'"
      [showDateFilter]="false"
      [showActions]="true"
    >
      <div header-actions class="d-flex flex-wrap gap-2">
        <a [routerLink]="['/trainings_programs', trainingProgramId, 'trainings']" class="btn btn-outline-secondary fw-semibold">
          &larr; Volver a capacitaciones
        </a>
      </div>
    </app-page-header>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <button class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold" type="button" (click)="openCreateModal()">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nuevo participante
          </button>
        </div>
        <div class="col-12 col-xl-auto">
          <div style="width: min(320px, 100%);">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-transparent border-white/10 text-on-surface-variant">
                <span class="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                class="form-control bg-transparent border-white/10 text-on-surface dashboard-table-search"
                type="search"
                placeholder="Buscar por cedula, nombre, email o telefono..."
                [(ngModel)]="searchTerm"
                name="searchTerm"
                (ngModelChange)="applyFilters()"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-swal-alert *ngIf="message" [message]="message" type="success" (closed)="message = ''"></app-swal-alert>
    <app-swal-alert *ngIf="errorMessage" [message]="errorMessage" type="danger" (closed)="errorMessage = ''"></app-swal-alert>

    <div *ngIf="loadingParticipants" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">Cargando participantes...</div>
    </div>

    <div *ngIf="!loadingParticipants && participants.length === 0" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md mb-3">No hay participantes registrados.</div>
      <button class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold" type="button" (click)="openCreateModal()">
        <span class="material-symbols-outlined text-[18px]">add</span>
        Nuevo participante
      </button>
    </div>

    <div *ngIf="!loadingParticipants && participants.length > 0 && filteredParticipants.length > 0" class="card glass-card dashboard-table-card border-0 rounded-4 overflow-hidden mb-4">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 dashboard-table">
          <thead class="participant-table-head">
            <tr class="border-bottom border-white/10">
              <th class="ps-4 py-3 font-label-sm text-on-surface-variant text-uppercase participant-table-th">#</th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('document_number')">
                  Cedula <span class="material-symbols-outlined sort-icon">{{ getSortIcon('document_number') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('full_name')">
                  Nombre <span class="material-symbols-outlined sort-icon">{{ getSortIcon('full_name') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('email')">
                  Email <span class="material-symbols-outlined sort-icon">{{ getSortIcon('email') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('phone')">
                  Telefono <span class="material-symbols-outlined sort-icon">{{ getSortIcon('phone') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('completed_at')">
                  Estado <span class="material-symbols-outlined sort-icon">{{ getSortIcon('completed_at') }}</span>
                </button>
              </th>
              <th class="pe-4 py-3 font-label-sm text-on-surface-variant text-uppercase text-end participant-table-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let participant of filteredParticipants" class="border-bottom border-white/5">
              <td class="ps-4 py-3 font-mono text-on-surface">{{ participant.id }}</td>
              <td class="py-3 font-semibold text-on-surface">{{ participant.document_number }}</td>
              <td class="py-3 text-on-surface">{{ participant.full_name }}</td>
              <td class="py-3 text-on-surface-variant">{{ participant.email || '-' }}</td>
              <td class="py-3 text-on-surface-variant">{{ participant.phone || '-' }}</td>
              <td class="py-3">
                <span
                  class="badge rounded-pill px-3 py-2"
                  [class.bg-success-subtle]="participant.completed_at"
                  [class.text-success]="participant.completed_at"
                  [class.bg-secondary-subtle]="!participant.completed_at"
                  [class.text-secondary]="!participant.completed_at"
                >
                  {{ participant.completed_at ? 'Completado' : 'Pendiente' }}
                </span>
              </td>
              <td class="pe-4 py-3 text-end">
                <div class="dashboard-action-group">
                  <button
                    type="button"
                    class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="editParticipant(participant)"
                  >
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="removeParticipant(participant)"
                  >
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-3 px-md-4 py-3 border-top border-white/10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        <p class="text-on-surface-variant font-label-sm mb-0">
          Mostrando {{ filteredParticipants.length }} de {{ participants.length }} participantes
        </p>
      </div>
    </div>

    <div *ngIf="!loadingParticipants && participants.length > 0 && filteredParticipants.length === 0" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">No se encontraron participantes.</div>
    </div>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4 mt-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="material-symbols-outlined text-on-surface-variant">description</span>
            <span class="text-on-surface fw-semibold">Carga masiva</span>
            <span class="text-on-surface-variant font-label-sm">
              Descarga la plantilla y vuelve a cargarla para registrar varios participantes a la vez.
            </span>
          </div>
        </div>
        <div class="col-12 col-xl-auto">
          <div class="d-flex gap-2 flex-wrap">
            <input #participantsFileInput type="file" class="d-none" accept=".xlsx,.xls" (change)="importReport($event)" />
            <button
              type="button"
              class="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
              (click)="participantsFileInput.click()"
              [disabled]="importing"
            >
              <span class="material-symbols-outlined text-[16px]">upload_file</span>
              {{ importing ? 'Cargando...' : 'Cargar Excel' }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
              (click)="downloadReport()"
              [disabled]="exporting"
            >
              <span class="material-symbols-outlined text-[16px]">download</span>
              {{ exporting ? 'Generando...' : 'Descargar plantilla' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <app-modal-shell
      *ngIf="creating"
      kicker="Participantes de capacitación"
      title="Nuevo participante"
      subtitle="Registra un participante para esta capacitación."
      headerVariant="info"
      footerVariant="info"
      size="md"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      primaryLabel="Agregar participante"
      secondaryLabel="Cancelar"
      [primaryDisabled]="savingCreate"
      [primaryLoading]="savingCreate"
      (secondaryRequested)="closeCreateModal()"
      (primaryRequested)="saveCreateModal()"
      (closeRequested)="closeCreateModal()"
    >
      <div modal-body>
        <form #createForm="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Cedula *</label>
            <input
              #createDocumentNumberModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="createDocumentNumber"
              name="createDocumentNumber"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(createDocumentNumberModel.touched || createForm.submitted) && createDocumentNumberModel.invalid">
              La cedula es obligatoria.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Nombre *</label>
            <input
              #createFullNameModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="createFullName"
              name="createFullName"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(createFullNameModel.touched || createForm.submitted) && createFullNameModel.invalid">
              El nombre es obligatorio.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Email</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="createEmail" name="createEmail" />
          </div>
          <div class="mb-0">
            <label class="form-label small text-on-surface-variant">Telefono</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="createPhone" name="createPhone" />
          </div>
        </form>
      </div>
    </app-modal-shell>

    <app-modal-shell
      *ngIf="editingParticipant"
      kicker="Participantes de capacitación"
      title="Editar participante"
      [subtitle]="'Actualiza los datos de ' + editingParticipant.full_name + '.'"
      headerVariant="warning"
      footerVariant="warning"
      size="md"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      primaryLabel="Guardar cambios"
      secondaryLabel="Cancelar"
      [primaryDisabled]="savingEdit"
      [primaryLoading]="savingEdit"
      (secondaryRequested)="closeEditModal()"
      (primaryRequested)="saveEditModal()"
      (closeRequested)="closeEditModal()"
    >
      <div modal-body>
        <form #editForm="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Cedula *</label>
            <input
              #editDocumentNumberModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="editDocumentNumber"
              name="editDocumentNumber"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(editDocumentNumberModel.touched || editForm.submitted) && editDocumentNumberModel.invalid">
              La cedula es obligatoria.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Nombre *</label>
            <input
              #editFullNameModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="editFullName"
              name="editFullName"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(editFullNameModel.touched || editForm.submitted) && editFullNameModel.invalid">
              El nombre es obligatorio.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Email</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editEmail" name="editEmail" />
          </div>
          <div class="mb-0">
            <label class="form-label small text-on-surface-variant">Telefono</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editPhone" name="editPhone" />
          </div>
        </form>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host .participant-table-head th {
      font-size: 0.72rem;
      line-height: 1.1;
      letter-spacing: 0.08em;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host .participant-table-head .sortable-th {
      padding-top: 0.85rem;
      padding-bottom: 0.85rem;
    }

    :host .participant-sort-trigger {
      width: 100%;
      min-height: 1.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.4rem;
      padding: 0;
      white-space: nowrap;
      line-height: 1;
    }

    :host .participant-sort-trigger .sort-icon {
      font-size: 18px !important;
      flex: 0 0 auto;
    }

    :host-context(.light) .participant-table-head th {
      color: #334155;
    }

    :host-context(.light) .participant-sort-trigger {
      color: #1e293b;
    }

    :host-context(.light) .participant-sort-trigger:hover,
    :host-context(.light) .participant-sort-trigger:focus-visible {
      color: #0457bf;
    }
  `]
})
export class TrainingAssignComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @Input() trainingIdInput?: number;
  @Input() trainingTitleInput?: string;
  @Output() saved = new EventEmitter<void>();

  trainingId = 0;
  trainingProgramId = 0;
  trainingTitle = '';
  participants: TrainingParticipant[] = [];
  filteredParticipants: TrainingParticipant[] = [];
  searchTerm = '';
  sortKey = 'id';
  sortDir: 'asc' | 'desc' = 'desc';
  message = '';
  errorMessage = '';
  exporting = false;
  importing = false;
  loadingParticipants = false;
  creating = false;
  savingCreate = false;
  savingEdit = false;
  createDocumentNumber = '';
  createFullName = '';
  createEmail = '';
  createPhone = '';
  editDocumentNumber = '';
  editFullName = '';
  editEmail = '';
  editPhone = '';
  editingParticipant: TrainingParticipant | null = null;

  @ViewChild('createForm') private createForm?: NgForm;
  @ViewChild('editForm') private editForm?: NgForm;

  ngOnInit(): void {
    this.trainingId = this.trainingIdInput ?? +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.trainingProgramId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);
    this.trainingTitle = this.trainingTitleInput ?? '';

    this.loadTraining();
  }

  loadTraining(): void {
    this.trainingService.get(this.trainingId).subscribe({
      next: (training) => {
        this.trainingTitle = this.trainingTitle || training.title;
      }
    });

    this.reloadParticipants();
  }

  reloadParticipants(): void {
    this.loadingParticipants = true;
    this.loadingService.track(this.trainingService.getTrainingParticipants(this.trainingId))
      .pipe(finalize(() => (this.loadingParticipants = false)))
      .subscribe({
        next: (participants) => {
          this.participants = participants;
          this.applyFilters();
        },
        error: () => {
          this.participants = [];
          this.filteredParticipants = [];
          this.errorMessage = 'No fue posible cargar los participantes.';
        }
      });
  }

  applyFilters(): void {
    let result = [...this.participants];
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((participant) => {
        const statusLabel = participant.completed_at ? 'completado' : 'pendiente';
        return (
          participant.document_number.toLowerCase().includes(term) ||
          participant.full_name.toLowerCase().includes(term) ||
          (participant.email || '').toLowerCase().includes(term) ||
          (participant.phone || '').toLowerCase().includes(term) ||
          statusLabel.includes(term)
        );
      });
    }

    result.sort((a, b) => {
      const left = this.getSortValue(a, this.sortKey);
      const right = this.getSortValue(b, this.sortKey);
      const comparison = left.localeCompare(right, 'es', { numeric: true, sensitivity: 'base' });
      return this.sortDir === 'asc' ? comparison : -comparison;
    });

    this.filteredParticipants = result;
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }

    this.applyFilters();
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) {
      return 'unfold_more';
    }

    return this.sortDir === 'asc' ? 'north' : 'south';
  }

  getSortValue(participant: TrainingParticipant, key: string): string {
    switch (key) {
      case 'document_number':
        return participant.document_number || '';
      case 'full_name':
        return participant.full_name || '';
      case 'email':
        return participant.email || '';
      case 'phone':
        return participant.phone || '';
      case 'completed_at':
        return participant.completed_at ? '1' : '0';
      case 'id':
      default:
        return String(participant.id ?? 0);
    }
  }

  openCreateModal(): void {
    this.creating = true;
    this.errorMessage = '';
    this.createDocumentNumber = '';
    this.createFullName = '';
    this.createEmail = '';
    this.createPhone = '';
    this.savingCreate = false;
  }

  closeCreateModal(): void {
    this.creating = false;
  }

  saveCreateModal(): void {
    const formInstance = this.createForm;
    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.trainingId || !this.createDocumentNumber.trim() || !this.createFullName.trim()) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      document_number: this.createDocumentNumber.trim(),
      full_name: this.createFullName.trim(),
      email: this.createEmail.trim() || undefined,
      phone: this.createPhone.trim() || undefined,
    };

    this.savingCreate = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.createTrainingParticipant(this.trainingId, payload))
      .pipe(finalize(() => (this.savingCreate = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.saved.emit();
          this.closeCreateModal();
          this.reloadParticipants();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'No se pudo guardar el participante.';
        }
      });
  }

  editParticipant(participant: TrainingParticipant): void {
    this.editingParticipant = participant;
    this.editDocumentNumber = participant.document_number;
    this.editFullName = participant.full_name;
    this.editEmail = participant.email || '';
    this.editPhone = participant.phone || '';
    this.errorMessage = '';
    this.savingEdit = false;
  }

  closeEditModal(): void {
    this.editingParticipant = null;
  }

  saveEditModal(): void {
    const participant = this.editingParticipant;
    const formInstance = this.editForm;

    if (!participant) {
      return;
    }

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.trainingId || !this.editDocumentNumber.trim() || !this.editFullName.trim()) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      document_number: this.editDocumentNumber.trim(),
      full_name: this.editFullName.trim(),
      email: this.editEmail.trim() || undefined,
      phone: this.editPhone.trim() || undefined,
    };

    this.savingEdit = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.updateTrainingParticipant(this.trainingId, participant.id, payload))
      .pipe(finalize(() => (this.savingEdit = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.saved.emit();
          this.closeEditModal();
          this.reloadParticipants();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'No se pudo guardar el participante.';
        }
      });
  }

  removeParticipant(participant: TrainingParticipant): void {
    const confirmed = window.confirm(`Eliminar a ${participant.full_name}?`);
    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteTrainingParticipant(this.trainingId, participant.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.saved.emit();
        this.reloadParticipants();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo eliminar el participante.';
      }
    });
  }

  downloadReport(): void {
    if (this.exporting || !this.trainingId) {
      return;
    }

    this.errorMessage = '';
    this.exporting = true;

    this.loadingService.track(this.trainingService.downloadTrainingParticipantsReport(this.trainingId))
      .pipe(finalize(() => (this.exporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `plantilla-participantes-${this.trainingId}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.message = 'Plantilla Excel descargada correctamente.';
        },
        error: () => (this.errorMessage = 'Error al descargar la plantilla Excel.')
      });
  }

  importReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.importing || !this.trainingId) {
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.importing = true;

    this.loadingService.track(this.trainingService.importTrainingParticipantsReport(this.trainingId, file))
      .pipe(finalize(() => {
        this.importing = false;
        input.value = '';
      }))
      .subscribe({
        next: (result) => {
          this.message = `Carga procesada: ${result.created} creados, ${result.updated} actualizados y ${result.skipped} omitidos.`;
          if (result.errors.length > 0) {
            this.errorMessage = `Se omitieron ${result.skipped} filas por errores de validacion.`;
          }
          this.reloadParticipants();
        },
        error: () => {
          this.errorMessage = 'Error al cargar el Excel de participantes.';
        }
      });
  }

  closeModal(): void {
    const programId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);

    if (programId > 0) {
      void this.router.navigate(['/trainings_programs', programId, 'trainings']);
      return;
    }

    void this.router.navigate(['/trainings_programs']);
  }
}
