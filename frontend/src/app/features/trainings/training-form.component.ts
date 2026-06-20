import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbActiveModal, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Training } from '../../core/services/training.service';

@Component({
  selector: 'app-training-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbAlertModule, ModalShellComponent],
  template: `
    <app-modal-shell
      kicker="Modulo capacitaciones"
      [title]="(isEdit ? 'Editar' : 'Nueva') + ' capacitacion'"
      subtitle="Ajusta los datos de la capacitacion sin salir del listado."
      [showHeaderClose]="isModal"
      [showFooterClose]="isModal"
      [showFooter]="true"
      [headerVariant]="isEdit ? 'warning' : 'primary'"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <a *ngIf="!isModal" routerLink="/trainings" class="btn btn-outline-secondary btn-sm">Volver</a>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger mb-3">{{ errorMessage }}</div>

        <div *ngIf="loading" class="training-form-loading text-center py-5">
          <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
          <div class="mt-3 text-muted">Cargando capacitacion...</div>
        </div>

        <form (ngSubmit)="save()" #form="ngForm" id="training-form" *ngIf="!loading">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label">Titulo *</label>
              <input class="form-control" [(ngModel)]="model.title" name="title" required />
            </div>

            <div class="col-md-4">
              <label class="form-label">Estado *</label>
              <select class="form-select" [(ngModel)]="model.status" name="status" required>
                <option value="scheduled">Programada</option>
                <option value="completed">Realizada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div class="col-12">
              <label class="form-label">Descripcion</label>
              <textarea class="form-control" [(ngModel)]="model.description" name="description" rows="3"></textarea>
            </div>

            <div class="col-md-4">
              <label class="form-label">Tipo *</label>
              <select class="form-select" [(ngModel)]="model.type" name="type" required>
                <option value="medical_exam">Examen Medico</option>
                <option value="sst_training">Capacitacion SST</option>
                <option value="drill">Simulacro</option>
                <option value="induction">Induccion</option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label">Modalidad *</label>
              <select class="form-select" [(ngModel)]="model.modality" name="modality" required>
                <option value="presential">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label">Obligatoria</label>
              <select class="form-select" [(ngModel)]="model.mandatory" name="mandatory">
                <option [ngValue]="true">Si</option>
                <option [ngValue]="false">No</option>
              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label">Fecha Programada *</label>
              <input type="date" class="form-control" [(ngModel)]="model.scheduled_date" name="scheduled_date" required />
            </div>

            <div class="col-md-3">
              <label class="form-label">Fecha Realizacion</label>
              <input type="date" class="form-control" [(ngModel)]="model.completion_date" name="completion_date" />
            </div>

            <div class="col-md-2">
              <label class="form-label">Duracion (horas)</label>
              <input type="number" class="form-control" [(ngModel)]="model.duration_hours" name="duration_hours" min="1" />
            </div>

            <div class="col-md-2">
              <label class="form-label">Puntaje min. %</label>
              <input type="number" class="form-control" [(ngModel)]="model.passing_score" name="passing_score" min="0" max="100" />
            </div>

            <div class="col-md-4">
              <label class="form-label">Lugar</label>
              <input class="form-control" [(ngModel)]="model.location" name="location" />
            </div>

            <div class="col-md-4">
              <label class="form-label">Instructor</label>
              <input class="form-control" [(ngModel)]="model.instructor" name="instructor" />
            </div>
          </div>
        </form>
      </div>

      <div modal-footer-actions>
        <button
          type="submit"
          class="btn"
          [ngClass]="isEdit ? 'btn-warning' : 'btn-primary'"
          [disabled]="loading || saving"
          form="training-form"
        >
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ isEdit ? 'Actualizar' : 'Crear' }}
        </button>
      </div>
    </app-modal-shell>
  `
  ,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .training-form-loading {
      border: 1px dashed rgba(20, 98, 255, 0.2);
      border-radius: 1rem;
      background: rgba(20, 98, 255, 0.04);
    }
  `]
})
export class TrainingFormComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly activeModal = inject(NgbActiveModal, { optional: true });

  @Input() trainingIdInput?: number;
  @Output() saved = new EventEmitter<void>();

  isEdit = false;
  trainingId?: number;
  loading = true;
  saving = false;
  errorMessage = '';

  model: Partial<Training> = {
    title: '',
    description: '',
    type: 'sst_training',
    modality: 'presential',
    scheduled_date: '',
    completion_date: undefined,
    duration_hours: undefined,
    location: '',
    instructor: '',
    mandatory: true,
    status: 'scheduled',
    passing_score: 70,
  };

  ngOnInit(): void {
    const id = this.trainingIdInput ?? Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.isEdit = true;
      this.trainingId = +id;
      this.loadTraining();
    } else {
      this.loading = false;
    }
  }

  loadTraining(): void {
    this.loadingService.track(this.trainingService.get(this.trainingId!))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (training) => {
          this.model = {
            title: training.title,
            description: training.description,
            type: training.type,
            modality: training.modality,
            scheduled_date: training.scheduled_date,
            completion_date: training.completion_date ?? undefined,
            duration_hours: training.duration_hours ?? undefined,
            location: training.location ?? undefined,
            instructor: training.instructor ?? undefined,
            mandatory: training.mandatory,
            status: training.status,
            passing_score: training.passing_score,
          };
        },
        error: () => {
          this.errorMessage = 'Error al cargar la capacitacion.';
          this.loading = false;
        }
      });
  }

  save(): void {
    this.saving = true;
    this.errorMessage = '';

    const obs = this.isEdit
      ? this.trainingService.update(this.trainingId!, this.model)
      : this.trainingService.create(this.model);

    this.loadingService.track(obs)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.saved.emit();
          if (this.activeModal) {
            this.activeModal.close('saved');
            return;
          }

          this.router.navigate(['/trainings']);
        },
        error: () => (this.errorMessage = 'Error al guardar la capacitacion.')
      });
  }

  closeModal(): void {
    this.activeModal?.dismiss('close');
  }

  get isModal(): boolean {
    return !!this.activeModal;
  }
}
