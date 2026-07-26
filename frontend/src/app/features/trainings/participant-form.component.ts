import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { AuthService } from '../../core/services/auth.service';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingParticipant, TrainingService } from '../../core/services/training.service';
import { Select3Component } from '../../shared/select3.component';

@Component({
  selector: 'app-participant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent, Select3Component],
  template: `
    <app-modal-shell
      kicker="Modulo SST"
      [title]="editingId ? 'Editar participante' : 'Nuevo participante'"
      subtitle="Actualiza la cedula, datos de contacto y nombre completo."
      [showHeaderClose]="true"
      [showFooterClose]="true"
      [headerVariant]="editingId ? 'warning' : 'primary'"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div *ngIf="errorMessage" class="alert alert-danger mb-3">{{ errorMessage }}</div>

        <form #participantForm="ngForm" novalidate (ngSubmit)="save(participantForm)">
          <div class="row g-3">
            <div class="col-12 col-md-3">
              <label class="form-label">Cedula *</label>
              <input #documentModel="ngModel" class="form-control" [(ngModel)]="form.document_number" name="document_number" placeholder="Cedula *" required />
              <div class="invalid-feedback d-block" *ngIf="(documentModel.touched || participantForm.submitted) && documentModel.invalid">
                La cedula es obligatoria.
              </div>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">Nombre completo *</label>
              <input #nameModel="ngModel" class="form-control" [(ngModel)]="form.full_name" name="full_name" placeholder="Nombre completo *" required />
              <div class="invalid-feedback d-block" *ngIf="(nameModel.touched || participantForm.submitted) && nameModel.invalid">
                El nombre completo es obligatorio.
              </div>
            </div>
            <div class="col-12 col-md-3">
              <label class="form-label">Email</label>
              <input #emailModel="ngModel" class="form-control" [(ngModel)]="form.email" name="email" placeholder="Email" type="email" />
              <div class="invalid-feedback d-block" *ngIf="(emailModel.touched || participantForm.submitted) && emailModel.invalid">
                Ingresa un correo valido.
              </div>
            </div>
            <div class="col-12 col-md-2">
              <label class="form-label">Telefono</label>
              <input class="form-control" [(ngModel)]="form.phone" name="phone" placeholder="Telefono" />
            </div>
          </div>
          <div class="mt-3">
            <label class="form-label">Empresa *</label>
            <ng-container *ngIf="!isEmpresaScopedUser; else empresaReadonly">
              <app-select3
                #empresaModel="ngModel"
                [options]="empresaOptions"
                [(ngModel)]="form.empresa_id"
                name="empresa_id"
                placeholder="Selecciona una empresa"
                required
              ></app-select3>
              <div class="invalid-feedback d-block" *ngIf="(empresaModel.touched || participantForm.submitted) && empresaModel.invalid">
                La empresa es obligatoria.
              </div>
            </ng-container>
            <ng-template #empresaReadonly>
              <div class="form-control bg-transparent border border-white/10 text-on-surface d-flex align-items-center">
                {{ scopedEmpresaLabel }}
              </div>
            </ng-template>
          </div>
        </form>
      </div>

      <div modal-footer-start>
        <small class="text-muted">Los campos con * son obligatorios.</small>
      </div>

      <div modal-footer-actions>
        <button
          type="button"
          class="btn"
          [ngClass]="editingId ? 'btn-warning' : 'btn-primary'"
          (click)="save()"
          [disabled]="saving"
        >
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ editingId ? 'Actualizar' : 'Crear' }}
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [/* styles intentionally cleared for custom implementation */]
})
export class ParticipantFormComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly empresaService = inject(EmpresaService);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } = { close: () => {}, dismiss: () => {} };
  private readonly currentUser = this.authService.getCurrentUser();

  @Input() participantInput?: TrainingParticipant;
  @Output() saved = new EventEmitter<void>();

  editingId: number | null = null;
  saving = false;
  errorMessage = '';
  empresas: Empresa[] = [];
  @ViewChild('participantForm') private participantForm?: NgForm;

  get isEmpresaScopedUser(): boolean {
    return this.currentUser?.role_relation?.slug === 'empresa';
  }

  get scopedEmpresaLabel(): string {
    const empresaId = this.form.empresa_id ?? this.currentUser?.empresa_id ?? null;
    return this.empresas.find((empresa) => empresa.id === empresaId)?.name
      ?? this.currentUser?.empresa_relation?.name
      ?? 'Empresa asignada';
  }

  form: Partial<TrainingParticipant> = {
    document_number: '',
    full_name: '',
    email: '',
    phone: '',
    empresa_id: null
  };

  ngOnInit(): void {
    this.loadEmpresas();

    if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
      this.form.empresa_id = this.currentUser.empresa_id;
    }

    if (this.participantInput) {
      this.editingId = this.participantInput.id;
      this.form = {
        document_number: this.participantInput.document_number,
        full_name: this.participantInput.full_name,
        email: this.participantInput.email,
        phone: this.participantInput.phone,
        empresa_id: this.isEmpresaScopedUser
          ? (this.currentUser?.empresa_id ?? this.participantInput.empresa_id ?? null)
          : (this.participantInput.empresa_id ?? null)
      };
    }
  }

  get empresaOptions(): Array<{ value: number; label: string }> {
    return this.empresas.map((empresa) => ({ value: empresa.id, label: empresa.name }));
  }

  loadEmpresas(): void {
    this.empresaService.list().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
          this.form.empresa_id = this.currentUser.empresa_id;
        }
      }
    });
  }

  save(participantForm?: NgForm): void {
    const formInstance = participantForm ?? this.participantForm;

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.form.document_number || !this.form.full_name) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    if (!this.form.empresa_id) {
      this.errorMessage = 'La empresa es obligatoria.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const obs = this.editingId
      ? this.trainingService.updateParticipant(this.editingId, this.form)
      : this.trainingService.createParticipant(this.form);

    this.loadingService.track(obs).subscribe({
      next: () => {
        this.saved.emit();
        this.activeModal.close('saved');
      },
      error: () => {
        this.errorMessage = 'Error al guardar participante.';
        this.saving = false;
      }
    });
  }

  closeModal(): void {
    this.activeModal.dismiss('close');
  }
}
