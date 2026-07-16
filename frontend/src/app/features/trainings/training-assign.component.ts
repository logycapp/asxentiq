import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingParticipant } from '../../core/services/training.service';

@Component({
  selector: 'app-training-assign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalShellComponent],
  template: `
    <app-modal-shell
      kicker="Asignacion"
      [title]="'Participantes: ' + trainingTitle"
      subtitle="Selecciona los participantes que deben tomar esta capacitacion."
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showFooter]="true"
      headerVariant="warning"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div *ngIf="!isModal" class="mb-3">
          <a routerLink="/trainings" class="btn btn-outline-secondary btn-sm">&larr; Capacitaciones</a>
        </div>

        <div *ngIf="message" class="alert alert-success alert-dismissible">{{ message }}
          <button type="button" class="btn-close" (click)="message = ''"></button>
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header d-flex justify-content-between">
                <span>Participantes disponibles</span>
              </div>
              <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                <div *ngIf="availableParticipants.length === 0" class="text-muted">Todos los participantes estan asignados.</div>
                <div *ngFor="let p of availableParticipants" class="form-check">
                  <input class="form-check-input" type="checkbox" [checked]="selectedIds.has(p.id)" (change)="toggleParticipant(p.id)" />
                  <label class="form-check-label">{{ p.full_name }} ({{ p.document_number }})</label>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card">
              <div class="card-header">Participantes asignados</div>
              <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                <div *ngIf="assignedParticipants.length === 0" class="text-muted">No hay participantes asignados.</div>
                <div *ngFor="let p of assignedParticipants" class="d-flex justify-content-between align-items-center mb-1">
                  <span>{{ p.full_name }} ({{ p.document_number }})</span>
                  <button class="btn btn-sm btn-outline-danger" (click)="removeParticipant(p.id)">Quitar</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3" *ngIf="selectedIds.size > 0">
          <button class="btn btn-primary" (click)="assignParticipants()" [disabled]="saving">
            Asignar {{ selectedIds.size }} participante(s)
          </button>
        </div>
      </div>
    </app-modal-shell>
  `
})
export class TrainingAssignComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } | null = null;

  @Input() trainingIdInput?: number;
  @Input() trainingTitleInput?: string;
  @Output() saved = new EventEmitter<void>();

  trainingId = 0;
  trainingTitle = '';
  allParticipants: TrainingParticipant[] = [];
  assignedParticipants: TrainingParticipant[] = [];
  selectedIds = new Set<number>();
  message = '';
  errorMessage = '';
  saving = false;

  get isModal(): boolean {
    return !!this.activeModal;
  }

  get availableParticipants(): TrainingParticipant[] {
    const assignedIds = new Set(this.assignedParticipants.map(p => p.id));
    return this.allParticipants.filter(p => !assignedIds.has(p.id));
  }

  ngOnInit(): void {
    this.trainingId = this.trainingIdInput ?? +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.trainingTitle = this.trainingTitleInput ?? '';
    this.loadData();
  }

  loadData(): void {
    this.trainingService.get(this.trainingId).subscribe({
      next: (t) => {
        this.trainingTitle = this.trainingTitle || t.title;
      }
    });

    this.loadingService.track(this.trainingService.getAssignedParticipants(this.trainingId)).subscribe({
      next: (participants) => (this.assignedParticipants = participants)
    });

    this.loadingService.track(this.trainingService.getAllParticipants()).subscribe({
      next: (participants) => (this.allParticipants = participants)
    });
  }

  toggleParticipant(participantId: number): void {
    if (this.selectedIds.has(participantId)) {
      this.selectedIds.delete(participantId);
    } else {
      this.selectedIds.add(participantId);
    }
  }

  assignParticipants(): void {
    this.saving = true;
    this.loadingService.track(this.trainingService.assignParticipants(this.trainingId, [...this.selectedIds]))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          this.message = res.message;
          this.selectedIds.clear();
          this.saved.emit();
          this.loadingService.track(this.trainingService.getAssignedParticipants(this.trainingId)).subscribe({
            next: (participants) => (this.assignedParticipants = participants)
          });
        },
        error: () => (this.errorMessage = 'Error al asignar participantes.')
      });
  }

  removeParticipant(participantId: number): void {
    this.loadingService.track(this.trainingService.removeParticipant(this.trainingId, participantId)).subscribe({
      next: (res) => {
        this.message = res.message;
        this.saved.emit();
        this.assignedParticipants = this.assignedParticipants.filter(p => p.id !== participantId);
      },
      error: () => (this.errorMessage = 'Error al remover participante.')
    });
  }

  closeModal(): void {
    if (this.activeModal) {
      this.activeModal.dismiss('close');
    } else {
      window.history.back();
    }
  }
}