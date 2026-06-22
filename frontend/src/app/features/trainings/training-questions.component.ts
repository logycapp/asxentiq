import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbActiveModal, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Question, QuestionOption } from '../../core/services/training.service';

@Component({
  selector: 'app-training-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbAlertModule, ModalShellComponent],
  template: `
    <app-modal-shell
      kicker="Banco de preguntas"
      [title]="'Preguntas: ' + trainingTitle"
      subtitle="Agrega, edita y administra las preguntas de la capacitacion."
      [showHeaderClose]="isModal"
      [showFooterClose]="isModal"
      [showFooter]="true"
      [headerVariant]="editingQuestionId ? 'warning' : 'info'"
      (closeRequested)="closeModal()"
    >
      <div modal-header-actions>
        <button type="button" class="btn btn-light btn-sm" (click)="showAddForm()">
          <i class="fa-solid fa-plus me-2"></i>
          Agregar pregunta
        </button>
      </div>

      <div modal-body>
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <a *ngIf="!isModal" routerLink="/trainings" class="btn btn-outline-secondary btn-sm">&larr; Capacitaciones</a>
          <span *ngIf="isModal" class="training-questions-modal-hint">Edicion rapida en modal</span>
        </div>

        <div *ngIf="message" class="alert alert-success alert-dismissible mb-3">
          {{ message }}
          <button type="button" class="btn-close" (click)="message = ''"></button>
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger mb-3">{{ errorMessage }}</div>

        <div *ngIf="editingQuestion" class="training-questions-editor mb-3">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div>
              <h6 class="mb-1">{{ editingQuestionId ? 'Editar' : 'Nueva' }} pregunta</h6>
              <p class="text-muted mb-0">Mantén el contenido corto y claro para facilitar la evaluación.</p>
            </div>
            <button type="button" class="btn btn-link text-decoration-none p-0" (click)="cancelEdit()">Cancelar</button>
          </div>

          <div class="mb-2">
            <label class="form-label">Tipo</label>
            <select class="form-select" [(ngModel)]="editForm.type" (change)="onTypeChange()">
              <option value="open">Abierta</option>
              <option value="multiple_choice">Opcion Multiple</option>
              <option value="yes_no">Si / No</option>
            </select>
          </div>
          <div class="mb-2">
            <label class="form-label">Pregunta</label>
            <textarea class="form-control" [(ngModel)]="editForm.question_text" rows="3"></textarea>
          </div>
          <div class="mb-2">
            <label class="form-label">Orden</label>
            <input type="number" class="form-control form-control-sm" [(ngModel)]="editForm.order" style="width: 80px" />
          </div>

          <div class="mt-3 border rounded-3 p-3 bg-light">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
              <div>
                <label class="form-label mb-1">Material adicional opcional</label>
                <div class="text-muted small">
                  Este archivo se mostrara al participante junto con esta pregunta. No es obligatorio.
                </div>
              </div>
              <span class="badge bg-secondary-subtle text-secondary-emphasis">Opcional</span>
            </div>

            <div class="row g-2 align-items-end">
              <div class="col-lg-7">
                <label class="form-label small text-muted">Archivo</label>
                <input type="file" class="form-control" (change)="onQuestionMaterialSelected($event)" />
              </div>
              <div class="col-lg-3">
                <label class="form-label small text-muted">Tipo</label>
                <select class="form-select" [(ngModel)]="questionMaterialType" name="questionMaterialType">
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="spreadsheet">Hoja de calculo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div class="col-lg-2">
                <button type="button" class="btn btn-outline-secondary w-100" (click)="clearQuestionMaterial()">
                  Limpiar
                </button>
              </div>
            </div>

            <div *ngIf="editingQuestionId && editingQuestionMaterials.length > 0" class="mt-3">
              <div class="small text-muted mb-2">Material ya cargado:</div>
              <ul class="list-group list-group-flush">
                <li *ngFor="let material of editingQuestionMaterials" class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2">
                  <div class="d-flex align-items-center gap-2">
                    <a [href]="'/api/storage/' + material.filepath" target="_blank" class="text-decoration-none">
                      <i class="fa-solid fa-paperclip me-1 text-primary"></i>
                      {{ material.filename }}
                    </a>
                    <span class="badge bg-light text-dark text-uppercase">{{ material.type }}</span>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeQuestionMaterial(material)">
                    Eliminar
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div *ngIf="editForm.type === 'multiple_choice'" class="mt-3">
            <label class="form-label">Opciones</label>
            <div *ngFor="let opt of editingOptions; let i = index" class="input-group mb-2">
              <input
                class="form-control form-control-sm"
                [(ngModel)]="opt.option_text"
                placeholder="Opcion {{ i + 1 }}"
              />
              <div class="input-group-text">
                <input type="radio" [name]="'correct_' + i" [checked]="opt.is_correct" (change)="setCorrectOption(i)" />
                <span class="ms-1 small">Correcta</span>
              </div>
              <button type="button" class="btn btn-outline-danger btn-sm" (click)="editingOptions.splice(i, 1)">X</button>
            </div>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-1" (click)="addOption()">+ Opcion</button>
          </div>

        </div>

        <div *ngIf="!loading && questions.length === 0" class="training-questions-empty">
          No hay preguntas. Agregue la primera pregunta.
        </div>

        <div *ngIf="questions.length > 0" class="training-questions-list">
          <div *ngFor="let q of questions; let i = index" class="training-question-item">
            <div class="d-flex justify-content-between gap-3">
              <div>
                <strong>{{ i + 1 }}.</strong> {{ q.question_text }}
                <span class="badge bg-info ms-2">{{ typeLabel(q.type) }}</span>
                <span class="badge bg-secondary ms-1">Orden: {{ q.order }}</span>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="editQuestion(q)">Editar</button>
                <button type="button" class="btn btn-sm btn-outline-danger" (click)="deleteQuestion(q)">Eliminar</button>
              </div>
            </div>
            <div *ngIf="q.options && q.options.length > 0" class="mt-2 ms-4">
              <div *ngFor="let opt of q.options" class="small">
                <span [class.text-success]="opt.is_correct" [class.fw-bold]="opt.is_correct">
                  <i [class]="opt.is_correct ? 'fa-solid fa-circle-check text-success' : 'fa-regular fa-circle text-muted'"></i>
                  <span class="ms-1">{{ opt.option_text }}</span>
                </span>
              </div>
            </div>
            <div *ngIf="q.materials && q.materials.length > 0" class="mt-3 ms-4">
              <div class="small text-muted mb-2">Material adjunto</div>
              <div *ngFor="let material of q.materials" class="d-flex justify-content-between align-items-center gap-2 small mb-2">
                <a [href]="'/api/storage/' + material.filepath" target="_blank" class="text-decoration-none">
                  <i class="fa-solid fa-paperclip me-1 text-primary"></i>
                  {{ material.filename }}
                </a>
                <span class="badge bg-light text-dark text-uppercase">{{ material.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div modal-footer-actions *ngIf="editingQuestion">
        <button type="button" class="btn btn-light" (click)="cancelEdit()">Cancelar</button>
        <button
          type="button"
          class="btn"
          [ngClass]="editingQuestionId ? 'btn-warning' : 'btn-primary'"
          (click)="saveQuestion()"
        >
          {{ editingQuestionId ? 'Actualizar' : 'Crear' }}
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .training-questions-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      border-radius: 1.5rem;
      overflow: hidden;
      background: linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
    }

    .training-questions-shell--modal {
      height: 100%;
      max-height: 100%;
      min-width: min(100%, 980px);
    }

    .training-questions-hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 3.5rem 1.25rem 1.4rem;
      color: #fff;
      background: linear-gradient(135deg, var(--brand-cyan, #1dbbd6), var(--brand-green, #42d483));
    }

    .training-modal-close {
      position: absolute;
      top: 0.9rem;
      right: 0.9rem;
      width: 2.25rem;
      height: 2.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
      font-size: 1rem;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .training-modal-close:hover {
      transform: scale(1.04);
      background: rgba(255, 255, 255, 0.28);
    }

    .training-questions-kicker {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      opacity: 0.82;
    }

    .training-questions-title {
      font-size: 1.35rem;
      font-weight: 800;
    }

    .training-questions-subtitle {
      opacity: 0.88;
    }

    .training-questions-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.35rem;
      background: rgba(255, 255, 255, 0.96);
    }

    .training-questions-modal-hint {
      color: var(--muted, #55617a);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .training-questions-editor,
    .training-question-item {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 10px 24px rgba(11, 27, 73, 0.05);
    }

    .training-questions-editor {
      padding: 1.1rem;
    }

    .training-questions-list {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .training-question-item {
      padding: 1rem 1.1rem;
    }

    .training-questions-empty {
      padding: 1.15rem;
      border-radius: 1rem;
      color: var(--muted, #55617a);
      background: rgba(20, 98, 255, 0.04);
      border: 1px dashed rgba(20, 98, 255, 0.18);
    }

    .training-questions-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
    }

    .training-questions-footer .btn {
      min-width: 110px;
    }

    @media (max-width: 576px) {
      .training-questions-hero,
      .training-questions-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .training-questions-footer .btn {
        width: 100%;
      }
    }
  `]
})
export class TrainingQuestionsComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly activeModal = inject(NgbActiveModal, { optional: true });

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
    this.activeModal?.dismiss('close');
  }
}
