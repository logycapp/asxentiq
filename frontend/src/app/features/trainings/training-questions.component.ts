import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Question, QuestionOption } from '../../core/services/training.service';

@Component({
  selector: 'app-training-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalShellComponent],
  template: `
    <app-modal-shell
      kicker="Banco de preguntas"
      [title]="'Preguntas: ' + trainingTitle"
      subtitle="Agrega, edita y administra las preguntas de la capacitacion."
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showFooter]="true"
      [headerVariant]="editingQuestionId ? 'warning' : 'info'"
      (closeRequested)="closeModal()"
    >
      <div modal-header-actions>
        <button type="button" class="btn btn-sm btn-outline-light fw-semibold d-inline-flex align-items-center gap-1" (click)="showAddForm()">
          <span class="material-symbols-outlined text-[16px]">add</span>
          Agregar pregunta
        </button>
      </div>

      <div modal-body>
        <div *ngIf="message" class="alert alert-success alert-dismissible mb-3">
          <button type="button" class="btn-close" aria-label="Close" (click)="message = ''"></button>
          {{ message }}
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger mb-3">{{ errorMessage }}</div>

        <div *ngIf="editingQuestion" class="border border-white/10 rounded-3 p-3 mb-3">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div>
              <h6 class="mb-1 text-on-surface">{{ editingQuestionId ? 'Editar' : 'Nueva' }} pregunta</h6>
              <p class="text-on-surface-variant font-label-sm mb-0">Manten el contenido corto y claro para facilitar la evaluacion.</p>
            </div>
            <button type="button" class="btn btn-outline-light fw-semibold btn-sm" (click)="cancelEdit()">Cancelar</button>
          </div>

          <div class="mb-2">
            <label class="form-label small text-on-surface-variant">Tipo</label>
            <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="editForm.type" (change)="onTypeChange()">
              <option value="open">Abierta</option>
              <option value="multiple_choice">Opcion Multiple</option>
              <option value="yes_no">Si / No</option>
            </select>
          </div>
          <div class="mb-2">
            <label class="form-label small text-on-surface-variant">Pregunta</label>
            <textarea class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editForm.question_text" rows="3"></textarea>
          </div>
          <div class="mb-2">
            <label class="form-label small text-on-surface-variant">Orden</label>
            <input type="number" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editForm.order" style="width: 80px" />
          </div>

          <div class="mt-3 border border-white/10 rounded-3 p-3">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
              <div>
                <label class="form-label small text-on-surface-variant mb-1">Material adicional opcional</label>
                <div class="text-on-surface-variant font-label-sm">
                  Este archivo se mostrara al participante junto con esta pregunta. No es obligatorio.
                </div>
              </div>
              <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1">Opcional</span>
            </div>

            <div class="row g-2 align-items-end">
              <div class="col-lg-7">
                <label class="form-label small text-on-surface-variant">Archivo</label>
                <input type="file" class="form-control bg-transparent border-white/10 text-on-surface" (change)="onQuestionMaterialSelected($event)" />
              </div>
              <div class="col-lg-3">
                <label class="form-label small text-on-surface-variant">Tipo</label>
                <select class="form-select bg-transparent border-white/10 text-on-surface" [(ngModel)]="questionMaterialType" name="questionMaterialType">
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="spreadsheet">Hoja de calculo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div class="col-lg-2">
                <button type="button" class="btn btn-outline-light fw-semibold w-100" (click)="clearQuestionMaterial()">
                  Limpiar
                </button>
              </div>
            </div>

            <div *ngIf="editingQuestionId && editingQuestionMaterials.length > 0" class="mt-3">
              <div class="font-label-sm text-on-surface-variant mb-2">Material ya cargado:</div>
              <div *ngFor="let material of editingQuestionMaterials" class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom border-white/5">
                <div class="d-flex align-items-center gap-2">
                  <a [href]="'/api/storage/' + material.filepath" target="_blank" class="text-decoration-none text-on-surface">
                    <span class="material-symbols-outlined text-[14px] align-middle">attach_file</span>
                    {{ material.filename }}
                  </a>
                  <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 text-uppercase">{{ material.type }}</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger fw-semibold" (click)="removeQuestionMaterial(material)">
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="editForm.type === 'multiple_choice'" class="mt-3">
            <label class="form-label small text-on-surface-variant">Opciones</label>
            <div *ngFor="let opt of editingOptions; let i = index" class="d-flex gap-2 mb-2 align-items-center">
              <input
                class="form-control bg-transparent border-white/10 text-on-surface flex-grow-1"
                [(ngModel)]="opt.option_text"
                placeholder="Opcion {{ i + 1 }}"
              />
              <div class="d-flex align-items-center gap-1">
                <input type="radio" [name]="'correct_' + i" [checked]="opt.is_correct" (change)="setCorrectOption(i)" />
                <span class="small text-on-surface-variant">Correcta</span>
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger fw-semibold" (click)="editingOptions.splice(i, 1)">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <button type="button" class="btn btn-outline-light fw-semibold btn-sm d-inline-flex align-items-center gap-1 mt-1" (click)="addOption()">
              <span class="material-symbols-outlined text-[16px]">add</span>
              Opcion
            </button>
          </div>

        </div>

        <div *ngIf="!loading && questions.length === 0" class="text-center py-4">
          <div class="text-on-surface-variant font-body-md">No hay preguntas. Agregue la primera pregunta.</div>
        </div>

        <div *ngIf="questions.length > 0" class="d-flex flex-column gap-2">
          <div *ngFor="let q of questions; let i = index" class="border border-white/10 rounded-3 p-3">
            <div class="d-flex justify-content-between gap-3">
              <div>
                <span class="text-on-surface fw-semibold">{{ i + 1 }}.</span>
                <span class="text-on-surface">{{ q.question_text }}</span>
                <span class="badge rounded-pill bg-info/20 text-info border border-info/20 px-2 py-1 ms-2">{{ typeLabel(q.type) }}</span>
                <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 ms-1">Orden: {{ q.order }}</span>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1" (click)="editQuestion(q)">
                  <span class="material-symbols-outlined text-[16px]">edit</span>Editar
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger fw-semibold d-inline-flex align-items-center gap-1" (click)="deleteQuestion(q)">
                  <span class="material-symbols-outlined text-[16px]">delete</span>Eliminar
                </button>
              </div>
            </div>
            <div *ngIf="q.options && q.options.length > 0" class="mt-2 ms-4">
              <div *ngFor="let opt of q.options" class="font-label-sm">
                <span [class]="opt.is_correct ? 'text-chart-green fw-semibold' : 'text-on-surface-variant'">
                  <span class="material-symbols-outlined text-[14px] align-middle">{{ opt.is_correct ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span class="ms-1">{{ opt.option_text }}</span>
                </span>
              </div>
            </div>
            <div *ngIf="q.materials && q.materials.length > 0" class="mt-3 ms-4">
              <div class="font-label-sm text-on-surface-variant mb-2">Material adjunto</div>
              <div *ngFor="let material of q.materials" class="d-flex justify-content-between align-items-center gap-2 font-label-sm mb-2">
                <a [href]="'/api/storage/' + material.filepath" target="_blank" class="text-decoration-none text-on-surface d-inline-flex align-items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">attach_file</span>
                  {{ material.filename }}
                </a>
                <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 text-uppercase">{{ material.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div modal-footer-actions *ngIf="editingQuestion">
        <button type="button" class="btn btn-outline-light fw-semibold" (click)="cancelEdit()">Cancelar</button>
        <button
          type="button"
          class="btn fw-semibold d-inline-flex align-items-center gap-1"
          [ngClass]="editingQuestionId ? 'btn-warning' : 'btn-primary'"
          (click)="saveQuestion()"
        >
          {{ editingQuestionId ? 'Actualizar' : 'Crear' }}
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [/* styles intentionally cleared for custom implementation */]
})
export class TrainingQuestionsComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } | null = null;

  @Input() trainingIdInput?: number;
  @Input() trainingTitleInput?: string;
  @Output() saved = new EventEmitter<void>();

  trainingId = 0;
  trainingTitle = '';
  questions: Question[] = [];
  loading = true;
  message = '';
  errorMessage = '';

  editingQuestion = false;
  editingQuestionId: number | null = null;
  editForm: Partial<Question> = { question_text: '', type: 'open', order: 0 };
  editingOptions: Partial<QuestionOption & { _tempId?: number }>[] = [];
  editingQuestionMaterials: NonNullable<Question['materials']> = [];
  questionMaterialFile: File | null = null;
  questionMaterialType = 'pdf';

  ngOnInit(): void {
    this.trainingId = this.trainingIdInput ?? +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.trainingTitle = this.trainingTitleInput ?? '';
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.loading = true;
    this.loadingService.track(this.trainingService.getQuestions(this.trainingId))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (questions) => {
          this.questions = questions;
        },
        error: () => (this.errorMessage = 'Error al cargar preguntas.')
      });

    this.loadingService.track(this.trainingService.get(this.trainingId)).subscribe({
      next: (t) => (this.trainingTitle = t.title)
    });
  }

  showAddForm(): void {
    this.editingQuestion = true;
    this.editingQuestionId = null;
    this.editForm = { question_text: '', type: 'open', order: this.questions.length + 1 };
    this.editingOptions = [];
    this.editingQuestionMaterials = [];
    this.clearQuestionMaterial();
  }

  editQuestion(q: Question): void {
    this.editingQuestion = true;
    this.editingQuestionId = q.id;
    this.editForm = { question_text: q.question_text, type: q.type, order: q.order };
    this.editingOptions = (q.options || []).map((o) => ({ ...o }));
    this.editingQuestionMaterials = q.materials ?? [];
    this.clearQuestionMaterial();
  }

  cancelEdit(): void {
    this.editingQuestion = false;
    this.editingQuestionId = null;
    this.editingOptions = [];
    this.editingQuestionMaterials = [];
    this.clearQuestionMaterial();
  }

  onTypeChange(): void {
    if (this.editForm.type === 'multiple_choice') {
      if (this.editingOptions.length === 0) {
        this.addOption();
        this.addOption();
      }
    } else if (this.editForm.type === 'yes_no') {
      this.editingOptions = [
        { option_text: 'Si', is_correct: false, order: 0 },
        { option_text: 'No', is_correct: false, order: 1 }
      ];
    } else {
      this.editingOptions = [];
    }
  }

  addOption(): void {
    this.editingOptions.push({ option_text: '', is_correct: false, order: this.editingOptions.length });
  }

  setCorrectOption(index: number): void {
    this.editingOptions.forEach((o, i) => (o.is_correct = i === index));
  }

  saveQuestion(): void {
    const normalizedOptions = this.editingOptions
      .map((opt, index) => ({
        option_text: (opt.option_text ?? '').trim(),
        is_correct: !!opt.is_correct,
        order: opt.order ?? index
      }))
      .filter((opt) => opt.option_text !== '');

    if ((this.editForm.type === 'multiple_choice' || this.editForm.type === 'yes_no') && normalizedOptions.length < 2) {
      this.errorMessage = 'La pregunta debe tener al menos 2 opciones.';
      return;
    }

    const payload = {
      question_text: this.editForm.question_text,
      type: this.editForm.type,
      order: this.editForm.order ?? 0,
      options: this.editForm.type === 'multiple_choice' || this.editForm.type === 'yes_no' ? normalizedOptions : []
    };

    const saveObs = this.editingQuestionId
      ? this.trainingService.updateQuestion(this.editingQuestionId, payload)
      : this.trainingService.createQuestion(this.trainingId, payload);

    this.loadingService.track(saveObs).subscribe({
      next: (res) => {
        const savedQuestion = res.question;

        if (!this.questionMaterialFile) {
          this.message = res.message;
          this.saved.emit();
          this.cancelEdit();
          this.loadQuestions();
          return;
        }

        const materialFile = this.questionMaterialFile;
        const materialType = this.questionMaterialType;

        this.loadingService.track(this.trainingService.uploadQuestionMaterial(savedQuestion.id, materialFile, materialType))
          .subscribe({
            next: () => {
              this.message = `${res.message} Material cargado correctamente.`;
              this.saved.emit();
              this.cancelEdit();
              this.loadQuestions();
            },
            error: () => {
              this.errorMessage = 'La pregunta se guardo, pero no se pudo cargar el material.';
            }
          });
      },
      error: () => (this.errorMessage = 'Error al guardar la pregunta.')
    });
  }

  onQuestionMaterialSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.questionMaterialFile = input.files?.[0] ?? null;
  }

  clearQuestionMaterial(): void {
    this.questionMaterialFile = null;
    this.questionMaterialType = 'pdf';
  }

  removeQuestionMaterial(material: NonNullable<Question['materials']>[number]): void {
    if (!this.editingQuestionId || !window.confirm(`Eliminar ${material.filename}?`)) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteQuestionMaterial(this.editingQuestionId, material.id)).subscribe({
      next: () => {
        this.editingQuestionMaterials = this.editingQuestionMaterials.filter((item) => item.id !== material.id);
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el material.';
      }
    });
  }

  deleteQuestion(q: Question): void {
    if (!window.confirm('Eliminar esta pregunta?')) return;
    this.loadingService.track(this.trainingService.deleteQuestion(q.id)).subscribe({
      next: () => {
        this.message = 'Pregunta eliminada.';
        this.saved.emit();
        this.loadQuestions();
      },
      error: () => (this.errorMessage = 'Error al eliminar.')
    });
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = { open: 'Abierta', multiple_choice: 'Multiple', yes_no: 'Si/No' };
    return labels[type] || type;
  }

  get isModal(): boolean {
    return !!this.activeModal;
  }

  closeModal(): void {
    if (this.activeModal) {
      this.activeModal.dismiss('close');
    } else {
      const programId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);

      if (programId > 0) {
        void this.router.navigate(['/trainings_programs', programId, 'trainings']);
        return;
      }

      void this.router.navigate(['/trainings_programs']);
    }
  }
}
