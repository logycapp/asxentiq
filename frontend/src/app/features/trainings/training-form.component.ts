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

            <div class="col-12">
              <div class="border rounded-3 p-3 bg-light-subtle">
                <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
                  <div>
                    <label class="form-label mb-1">Material general opcional</label>
                    <div class="text-muted small">
                      Se mostrara al participante antes de iniciar la prueba. No es obligatorio.
                    </div>
                  </div>
                  <span class="badge bg-secondary-subtle text-secondary-emphasis">Opcional</span>
                </div>

                <div class="row g-2 align-items-end">
                  <div class="col-lg-7">
                    <label class="form-label small text-muted">Archivo</label>
                    <input type="file" class="form-control" (change)="onTrainingMaterialSelected($event)" />
                  </div>
                  <div class="col-lg-3">
                    <label class="form-label small text-muted">Tipo</label>
                    <select class="form-select" [(ngModel)]="trainingMaterialType" name="trainingMaterialType">
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="spreadsheet">Hoja de calculo</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div class="col-lg-2">
                    <button type="button" class="btn btn-outline-secondary w-100" (click)="clearTrainingMaterial()">
                      Limpiar
                    </button>
                  </div>
                </div>

                <div *ngIf="trainingMaterials.length > 0" class="mt-3">
                  <div class="small text-muted mb-2">Material ya cargado:</div>
                  <ul class="list-group list-group-flush">
                    <li *ngFor="let material of trainingMaterials" class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2">
                      <div class="d-flex align-items-center gap-2">
                        <span>{{ material.filename }}</span>
                        <span class="badge bg-light text-dark text-uppercase">{{ material.type }}</span>
                      </div>
                      <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeTrainingMaterial(material)">
                        Eliminar
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
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
  trainingMaterials: NonNullable<Training['materials']> = [];
  trainingMaterialFile: File | null = null;
  trainingMaterialType = 'pdf';

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
            materials: training.materials,
          };
          this.trainingMaterials = training.materials ?? [];
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

    this.loadingService.track(obs).subscribe({
        next: (res) => {
          const training = res.training;
          this.trainingId = training.id;

          if (!this.trainingMaterialFile) {
            this.finishSave();
            return;
          }

          const materialFile = this.trainingMaterialFile;
          const materialType = this.trainingMaterialType;

          this.loadingService.track(this.trainingService.uploadTrainingMaterial(training.id, materialFile, materialType))
            .subscribe({
              next: (materialRes) => {
                this.trainingMaterials = [...this.trainingMaterials, materialRes.material];
                this.trainingMaterialFile = null;
                this.finishSave();
              },
              error: () => {
                this.saving = false;
                this.errorMessage = 'La capacitacion se guardo, pero no se pudo cargar el material.';
              }
            });
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error al guardar la capacitacion.';
        }
      });
  }

  onTrainingMaterialSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.trainingMaterialFile = input.files?.[0] ?? null;
  }

  clearTrainingMaterial(): void {
    this.trainingMaterialFile = null;
    this.trainingMaterialType = 'pdf';
  }

  removeTrainingMaterial(material: NonNullable<Training['materials']>[number]): void {
    if (!this.trainingId || !window.confirm(`Eliminar ${material.filename}?`)) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteTrainingMaterial(this.trainingId, material.id)).subscribe({
      next: () => {
        this.trainingMaterials = this.trainingMaterials.filter((item) => item.id !== material.id);
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el material.';
      }
    });
  }

  finishSave(): void {
    this.saving = false;
    this.saved.emit();
    if (this.activeModal) {
      this.activeModal.close('saved');
      return;
    }

    this.router.navigate(['/trainings']);
  }

  closeModal(): void {
    this.activeModal?.dismiss('close');
  }

  get isModal(): boolean {
    return !!this.activeModal;
  }
}
