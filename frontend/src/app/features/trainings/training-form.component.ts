import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingCategory, TrainingService, Training } from '../../core/services/training.service';

@Component({
  selector: 'app-training-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  template: `
    <app-modal-shell
      kicker="Modulo capacitaciones"
      [title]="isEdit ? 'Editar capacitacion' : 'Nuevo registro'"
      subtitle="Ajusta los datos de la capacitacion sin salir del listado."
      [headerVariant]="isEdit ? 'warning' : 'info'"
      [footerVariant]="isEdit ? 'warning' : 'primary'"
      size="lg"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      [primaryLabel]="isEdit ? 'Actualizar' : 'Crear'"
      secondaryLabel="Cancelar"
      [primaryDisabled]="loading || saving || categories.length === 0"
      [primaryLoading]="saving"
      (secondaryRequested)="closeModal()"
      (primaryRequested)="save()"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div *ngIf="errorMessage" class="alert alert-danger mb-3">{{ errorMessage }}</div>

        <div *ngIf="loading" class="text-center py-5">
          <div class="text-on-surface-variant font-body-md">Cargando capacitacion...</div>
        </div>

        <form (ngSubmit)="save()" #form="ngForm" id="training-form" *ngIf="!loading">
          <div class="row g-3">
            <div *ngIf="categories.length === 0" class="col-12">
              <div class="alert alert-warning py-2 mb-0 small d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                <span>Primero debes crear un programa para poder guardar la capacitacion.</span>
                <button type="button" class="btn btn-sm btn-outline-dark fw-semibold" (click)="goToPrograms()">Gestionar programas</button>
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label small text-on-surface-variant">Titulo *</label>
              <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.title" name="title" required />
            </div>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Programa *</label>
              <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.training_category_id" name="training_category_id" required [disabled]="categories.length === 0">
                <option [ngValue]="null">Selecciona un programa</option>
                <option *ngFor="let category of categories" [ngValue]="category.id">{{ category.name }}</option>
              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Estado *</label>
              <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.status" name="status" required>
                <option value="scheduled">Programada</option>
                <option value="completed">Realizada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div class="col-12">
              <label class="form-label small text-on-surface-variant">Descripcion</label>
              <textarea class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.description" name="description" rows="3"></textarea>
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Tipo *</label>
              <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.type" name="type" required>
                <option value="medical_exam">Examen Medico</option>
                <option value="sst_training">Capacitacion SST</option>
                <option value="drill">Simulacro</option>
                <option value="induction">Induccion</option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Modalidad *</label>
              <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.modality" name="modality" required>
                <option value="presential">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Obligatoria</label>
              <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.mandatory" name="mandatory">
                <option [ngValue]="true">Si</option>
                <option [ngValue]="false">No</option>
              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Fecha Programada *</label>
              <input type="date" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.scheduled_date" name="scheduled_date" required />
            </div>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Fecha Realizacion</label>
              <input type="date" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.completion_date" name="completion_date" />
            </div>

            <div class="col-md-2">
              <label class="form-label small text-on-surface-variant">Duracion (horas)</label>
              <input type="number" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.duration_hours" name="duration_hours" min="1" />
            </div>

            <div class="col-md-2">
              <label class="form-label small text-on-surface-variant">Puntaje min. %</label>
              <input type="number" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.passing_score" name="passing_score" min="0" max="100" />
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Lugar</label>
              <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.location" name="location" />
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Instructor</label>
              <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.instructor" name="instructor" />
            </div>

            <div class="col-12">
              <div class="border border-white/10 rounded-3 p-3">
                <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
                  <div>
                    <label class="form-label small text-on-surface-variant mb-1">Material general opcional</label>
                    <div class="text-on-surface-variant font-label-sm">
                      Se mostrara al participante antes de iniciar la prueba. No es obligatorio.
                    </div>
                  </div>
                  <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1">Opcional</span>
                </div>

                <div class="row g-2 align-items-end">
                  <div class="col-lg-7">
                    <label class="form-label small text-on-surface-variant">Archivo</label>
                    <input type="file" class="form-control bg-transparent border-white/10 text-on-surface" (change)="onTrainingMaterialSelected($event)" />
                  </div>
                  <div class="col-lg-3">
                    <label class="form-label small text-on-surface-variant">Tipo</label>
                    <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="trainingMaterialType" name="trainingMaterialType">
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="spreadsheet">Hoja de calculo</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div class="col-lg-2">
                    <button type="button" class="btn btn-outline-light fw-semibold w-100" (click)="clearTrainingMaterial()">
                      Limpiar
                    </button>
                  </div>
                </div>

                <div *ngIf="trainingMaterials.length > 0" class="mt-3">
                  <div class="font-label-sm text-on-surface-variant mb-2">Material ya cargado:</div>
                  <div *ngFor="let material of trainingMaterials" class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom border-white/5">
                    <div class="d-flex align-items-center gap-2">
                      <span class="text-on-surface">{{ material.filename }}</span>
                      <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 text-uppercase">{{ material.type }}</span>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger fw-semibold" (click)="removeTrainingMaterial(material)">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </app-modal-shell>
  `
  ,
  styles: [/* styles intentionally cleared for custom implementation */]
})
export class TrainingFormComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } | null = null;

  @Input() trainingIdInput?: number;
  @Output() saved = new EventEmitter<void>();

  isEdit = false;
  trainingId?: number;
  loading = true;
  saving = false;
  errorMessage = '';
  categories: TrainingCategory[] = [];
  trainingMaterials: NonNullable<Training['materials']> = [];
  trainingMaterialFile: File | null = null;
  trainingMaterialType = 'pdf';

  model: Partial<Training> = {
    training_category_id: undefined,
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
    this.loadCategories();
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
            training_category_id: training.training_category_id ?? training.category?.id ?? undefined,
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
    if (!this.model.training_category_id) {
      this.errorMessage = 'Selecciona un programa.';
      return;
    }

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

  loadCategories(): void {
    this.loadingService.track(this.trainingService.getCategories()).subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: () => {
        this.categories = [];
      }
    });
  }

  goToPrograms(): void {
    this.router.navigate(['/trainings_programs']);
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
    this.closeModal();
  }

  closeModal(): void {
    const programId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);

    if (programId > 0) {
      void this.router.navigate(['/trainings_programs', programId, 'trainings']);
      return;
    }

    void this.router.navigate(['/trainings_programs']);
  }

  get isModal(): boolean {
    return false;
  }
}
