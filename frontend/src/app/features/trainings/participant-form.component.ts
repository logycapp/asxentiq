import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingParticipant, TrainingService } from '../../core/services/training.service';

@Component({
  selector: 'app-participant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
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

        <div class="row g-3">
          <div class="col-12 col-md-3">
            <label class="form-label">Cedula *</label>
            <input class="form-control" [(ngModel)]="form.document_number" name="document_number" placeholder="Cedula *" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Nombre completo *</label>
            <input class="form-control" [(ngModel)]="form.full_name" name="full_name" placeholder="Nombre completo *" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Email</label>
            <input class="form-control" [(ngModel)]="form.email" name="email" placeholder="Email" />
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label">Telefono</label>
            <input class="form-control" [(ngModel)]="form.phone" name="phone" placeholder="Telefono" />
          </div>
        </div>
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
  private readonly loadingService = inject(LoadingService);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } = { close: () => {}, dismiss: () => {} };

  @Input() participantInput?: TrainingParticipant;
  @Output() saved = new EventEmitter<void>();

  editingId: number | null = null;
  saving = false;
  errorMessage = '';

  form: Partial<TrainingParticipant> = {
    document_number: '',
    full_name: '',
    email: '',
    phone: ''
  };

  ngOnInit(): void {
    if (this.participantInput) {
      this.editingId = this.participantInput.id;
      this.form = {
        document_number: this.participantInput.document_number,
        full_name: this.participantInput.full_name,
        email: this.participantInput.email,
        phone: this.participantInput.phone
      };
    }
  }

  save(): void {
    if (!this.form.document_number || !this.form.full_name) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
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
