import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingCategory, TrainingService, Training } from '../../core/services/training.service';
import { Select3Component } from '../../shared/select3.component';

@Component({
  selector: 'app-training-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent, Select3Component],
  template: `
    <app-modal-shell
      kicker="Modulo capacitaciones"
      [title]="isEdit ? 'Editar capacitacion' : 'Nuevo registro'"
      subtitle="Ajusta los datos de la capacitacion sin salir del listado."
      [headerVariant]="isEdit ? 'warning' : 'info'"
      [footerVariant]="isEdit ? 'warning' : 'primary'"
      size="xl"
      [showHeaderClose]="!saving"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="!saving"
      [primaryLabel]="isEdit ? 'Actualizar' : 'Crear'"
      secondaryLabel="Cancelar"
      [primaryDisabled]="loading || saving || (!fixedTrainingCategoryId && categories.length === 0)"
      [primaryLoading]="saving"
      (secondaryRequested)="closeModal()"
      (primaryRequested)="save()"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div style="position: relative;">
          <div
            *ngIf="saving"
            class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-3"
            style="z-index: 10; background: rgba(15, 23, 42, 0.72); min-height: 100%;"
            role="status"
            aria-live="polite"
          >
            <div class="text-center text-white p-4">
              <div class="spinner-border mb-3" aria-hidden="true"></div>
              <div class="fw-semibold">{{ trainingMaterialFile ? 'Cargando video...' : 'Guardando capacitacion...' }}</div>
              <div class="small opacity-75 mt-1">No cierres ni vuelvas a enviar este formulario.</div>
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-danger mb-3">{{ errorMessage }}</div>

          <div *ngIf="loading" class="text-center py-5">
            <div class="text-on-surface-variant font-body-md">Cargando capacitacion...</div>
          </div>

          <form (ngSubmit)="save(trainingForm)" #trainingForm="ngForm" id="training-form" novalidate *ngIf="!loading" [attr.inert]="saving ? '' : null">
          <div class="row g-3">
            <div *ngIf="!fixedTrainingCategoryId && categories.length === 0" class="col-12">
              <div class="alert alert-warning py-2 mb-0 small d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                <span>Primero debes crear un programa para poder guardar la capacitacion.</span>
                <button type="button" class="btn btn-sm btn-outline-dark fw-semibold" (click)="goToPrograms()">Gestionar programas</button>
              </div>
            </div>

            <div [class]="fixedTrainingCategoryId ? 'col-md-9' : 'col-md-6'">
              <label class="form-label small text-on-surface-variant">Titulo *</label>
              <input #titleModel="ngModel" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.title" name="title" required />
              <div class="invalid-feedback d-block" *ngIf="(titleModel.touched || trainingForm.submitted) && titleModel.invalid">
                El titulo es obligatorio.
              </div>
            </div>

            <div *ngIf="!fixedTrainingCategoryId; else fixedProgramHidden" class="col-md-3">
              <label class="form-label small text-on-surface-variant">Programa *</label>
              <app-select3
                #categoryModel="ngModel"
                [options]="categoryOptions"
                [(ngModel)]="model.training_category_id"
                name="training_category_id"
                placeholder="Selecciona un programa"
                [disabled]="categories.length === 0"
                required
              ></app-select3>
              <div class="invalid-feedback d-block" *ngIf="(categoryModel.touched || trainingForm.submitted) && categoryModel.invalid">
                Selecciona un programa.
              </div>
            </div>
            <ng-template #fixedProgramHidden>
              <input type="hidden" [(ngModel)]="model.training_category_id" name="training_category_id" />
            </ng-template>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Estado *</label>
              <app-select3
                #statusModel="ngModel"
                [options]="statusOptions"
                [(ngModel)]="model.status"
                name="status"
                placeholder="Selecciona un estado"
                required
              ></app-select3>
              <div class="invalid-feedback d-block" *ngIf="(statusModel.touched || trainingForm.submitted) && statusModel.invalid">
                Selecciona un estado.
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Modalidad *</label>
              <app-select3
                #modalityModel="ngModel"
                [options]="modalityOptions"
                [(ngModel)]="model.modality"
                name="modality"
                placeholder="Selecciona una modalidad"
                required
              ></app-select3>
              <div class="invalid-feedback d-block" *ngIf="(modalityModel.touched || trainingForm.submitted) && modalityModel.invalid">
                Selecciona una modalidad.
              </div>
            </div>

            <div class="col-12">
              <label class="form-label small text-on-surface-variant">Descripcion</label>
              <textarea class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.description" name="description" rows="3"></textarea>
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Obligatoria</label>
              <app-select3
                [options]="booleanOptions"
                [(ngModel)]="model.mandatory"
                name="mandatory"
                placeholder="Selecciona una opcion"
              ></app-select3>
            </div>

            <div class="col-md-4">
              <label class="form-label small text-on-surface-variant">Material con indexacion</label>
              <app-select3
                [options]="booleanOptions"
                [(ngModel)]="model.material_with_indexation"
                name="material_with_indexation"
                placeholder="Selecciona una opcion"
                (ngModelChange)="onMaterialWithIndexationChange($event)"
              ></app-select3>
            </div>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Intentos permitidos *</label>
              <input
                #maxAttemptsModel="ngModel"
                type="number"
                class="form-control bg-transparent border-white/10 text-on-surface"
                [(ngModel)]="model.max_attempts"
                name="max_attempts"
                min="1"
                required
              />
              <div class="invalid-feedback d-block" *ngIf="(maxAttemptsModel.touched || trainingForm.submitted) && maxAttemptsModel.invalid">
                Indica la cantidad de intentos permitidos.
              </div>
            </div>

            <div class="col-md-3">
              <label class="form-label small text-on-surface-variant">Fecha Programada *</label>
              <input #scheduledDateModel="ngModel" type="date" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="model.scheduled_date" name="scheduled_date" required />
              <div class="invalid-feedback d-block" *ngIf="(scheduledDateModel.touched || trainingForm.submitted) && scheduledDateModel.invalid">
                Selecciona una fecha programada.
              </div>
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
                      Se mostrara al participante antes de iniciar la prueba. Solo se permite un material por capacitacion.
                    </div>
                  </div>
                  <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1">Opcional</span>
                </div>

                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label small text-on-surface-variant">Tipo de archivo *</label>
                    <app-select3
                      [options]="trainingMaterialTypeOptions"
                      [(ngModel)]="trainingMaterialType"
                      name="trainingMaterialType"
                      placeholder="Selecciona un tipo"
                      (ngModelChange)="onTrainingMaterialTypeChange($event)"
                    ></app-select3>
                  </div>
                  <div class="col-12">
                    <label class="form-label small text-on-surface-variant">Archivo *</label>
                    <input
                      #trainingMaterialInput
                      type="file"
                      class="form-control bg-transparent border-white/10 text-on-surface"
                      [accept]="trainingMaterialAccept"
                      [disabled]="!trainingMaterialType"
                      (change)="onTrainingMaterialSelected($event)"
                    />
                    <div class="text-on-surface-variant font-label-sm mt-2">
                      {{ trainingMaterialHint }}
                    </div>
                  </div>
                  <div class="col-12 col-md-4 col-lg-3">
                    <button type="button" class="btn btn-outline-secondary fw-semibold w-100" (click)="clearTrainingMaterial()">
                      Limpiar
                    </button>
                  </div>
                </div>

                <div *ngIf="trainingMaterials.length > 0" class="mt-3">
                  <div class="font-label-sm text-on-surface-variant mb-2">Material ya cargado:</div>
                  <div *ngIf="trainingMaterials[0] as material" class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom border-white/5">
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
  private readonly location = inject(Location);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } | null = null;

  @Input() trainingIdInput?: number;
  @Input() embedded = false;
  @Input() fixedTrainingCategoryId?: number;
  @Input() fixedTrainingCategoryLabel = '';
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isEdit = false;
  trainingId?: number;
  loading = true;
  saving = false;
  errorMessage = '';
  categories: TrainingCategory[] = [];
  trainingMaterials: NonNullable<Training['materials']> = [];
  trainingMaterialFile: File | null = null;
  trainingMaterialType = 'pdf';
  @ViewChild('trainingForm') private trainingForm?: NgForm;
  @ViewChild('trainingMaterialInput') private trainingMaterialInput?: ElementRef<HTMLInputElement>;

  model: Partial<Training> = {
    training_category_id: undefined,
    title: '',
    description: '',
    modality: 'presential',
    scheduled_date: '',
    completion_date: undefined,
    duration_hours: undefined,
    location: '',
    instructor: '',
    mandatory: true,
    material_with_indexation: false,
    status: 'scheduled',
    passing_score: 70,
    max_attempts: 1,
  };

  get categoryOptions(): Array<{ value: number; label: string }> {
    return this.categories.map((category) => ({ value: category.id, label: category.name }));
  }

  get selectedCategoryLabel(): string {
    const selectedId = Number(this.model.training_category_id ?? 0);
    return this.categories.find((category) => category.id === selectedId)?.name ?? 'Programa fijo';
  }

  readonly statusOptions = [
    { value: 'scheduled', label: 'Programada' },
    { value: 'completed', label: 'Realizada' },
    { value: 'cancelled', label: 'Cancelada' },
  ];

  readonly modalityOptions = [
    { value: 'presential', label: 'Presencial' },
    { value: 'virtual', label: 'Virtual' },
    { value: 'mixed', label: 'Mixto' },
  ];

  readonly booleanOptions = [
    { value: true, label: 'Si' },
    { value: false, label: 'No' },
  ];

  readonly materialTypeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'video', label: 'Video' },
    { value: 'spreadsheet', label: 'Hoja de calculo' },
    { value: 'other', label: 'Otro' },
  ];

  get trainingMaterialTypeOptions(): Array<{ value: string; label: string }> {
    return this.model.material_with_indexation ? [{ value: 'video', label: 'Video' }] : this.materialTypeOptions;
  }

  ngOnInit(): void {
    this.loadCategories();
    const id = this.trainingIdInput ?? Number(this.route.snapshot.paramMap.get('id'));
    if (this.fixedTrainingCategoryId) {
      this.model.training_category_id = this.fixedTrainingCategoryId;
    }
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
          const resolvedCategoryId = this.fixedTrainingCategoryId ?? training.training_category_id ?? training.category?.id ?? undefined;
          this.model = {
            training_category_id: resolvedCategoryId,
            title: training.title,
            description: training.description,
            modality: training.modality,
            scheduled_date: training.scheduled_date,
            completion_date: training.completion_date ?? undefined,
            duration_hours: training.duration_hours ?? undefined,
            location: training.location ?? undefined,
            instructor: training.instructor ?? undefined,
            mandatory: training.mandatory,
            material_with_indexation: training.material_with_indexation ?? false,
            status: training.status,
            passing_score: training.passing_score,
            max_attempts: training.max_attempts ?? 1,
            materials: training.materials,
          };
          if (this.fixedTrainingCategoryId) {
            this.model.training_category_id = this.fixedTrainingCategoryId;
          }
          this.trainingMaterials = training.materials ?? [];
          this.trainingMaterialType = this.model.material_with_indexation ? 'video' : this.trainingMaterials[0]?.type ?? 'pdf';
          this.resetTrainingMaterialInput();
        },
        error: () => {
          this.errorMessage = 'Error al cargar la capacitacion.';
          this.loading = false;
        }
      });
  }

  save(form?: NgForm): void {
    const formInstance = form ?? this.trainingForm;

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    const categoryId = this.fixedTrainingCategoryId ?? this.model.training_category_id;

    if (!categoryId) {
      this.errorMessage = 'Selecciona un programa.';
      return;
    }

    this.model.training_category_id = categoryId;

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

          const uploadMaterial = (): void => {
            this.loadingService.track(this.trainingService.uploadTrainingMaterial(training.id, materialFile, materialType))
              .subscribe({
                next: (materialRes) => {
                  this.trainingMaterials = [materialRes.material];
                  this.trainingMaterialFile = null;
                  this.resetTrainingMaterialInput();
                  this.finishSave();
                },
                error: (error) => {
                  this.saving = false;
                  this.errorMessage = error?.error?.message || 'La capacitacion se guardo, pero no se pudo cargar el material.';
                }
              });
          };

          uploadMaterial();
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

  onTrainingMaterialTypeChange(value: string | number | boolean | null): void {
    if (this.model.material_with_indexation) {
      this.trainingMaterialType = 'video';
      return;
    }

    this.trainingMaterialType = typeof value === 'string' ? value : 'pdf';
    this.trainingMaterialFile = null;
    this.resetTrainingMaterialInput();
  }

  onMaterialWithIndexationChange(value: string | number | boolean | null): void {
    this.model.material_with_indexation = value === true;

    if (this.model.material_with_indexation) {
      this.trainingMaterialType = 'video';
      this.trainingMaterialFile = null;
      this.resetTrainingMaterialInput();
      return;
    }

    if (this.trainingMaterialType === 'video') {
      this.trainingMaterialType = 'pdf';
    }
  }

  clearTrainingMaterial(): void {
    this.trainingMaterialFile = null;
    this.trainingMaterialType = 'pdf';
    this.resetTrainingMaterialInput();
  }

  get trainingMaterialAccept(): string {
    if (this.model.material_with_indexation) {
      return 'video/*,.mp4,.m4v,.mov,.avi,.mkv,.webm';
    }

    switch (this.trainingMaterialType) {
      case 'video':
        return 'video/*,.mp4,.m4v,.mov,.avi,.mkv,.webm';
      case 'spreadsheet':
        return '.csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';
      case 'other':
        return '*/*';
      case 'pdf':
      default:
        return 'application/pdf,.pdf';
    }
  }

  get trainingMaterialHint(): string {
    if (this.model.material_with_indexation) {
      return 'Se aceptan solo videos por la indexacion.';
    }

    switch (this.trainingMaterialType) {
      case 'video':
        return 'Se aceptan archivos de video.';
      case 'spreadsheet':
        return 'Se aceptan hojas de calculo y CSV.';
      case 'other':
        return 'Se aceptan archivos generales.';
      case 'pdf':
      default:
        return 'Se aceptan archivos PDF.';
    }
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

  private resetTrainingMaterialInput(): void {
    if (this.trainingMaterialInput?.nativeElement) {
      this.trainingMaterialInput.nativeElement.value = '';
    }
  }

  finishSave(): void {
    this.saving = false;
    this.saved.emit();
    this.closeModal();
  }

  closeModal(): void {
    if (this.embedded) {
      this.closed.emit();
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

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
