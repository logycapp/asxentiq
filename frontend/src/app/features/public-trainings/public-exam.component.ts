import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Training, SubmitAnswer } from '../../core/services/training.service';

@Component({
  selector: 'app-public-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbAlertModule],
  template: `
    <div class="container py-4">
      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2">Cargando examen...</p>
      </div>

      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <!-- Material Section -->
      <div *ngIf="training && training.materials && training.materials.length > 0 && step === 'material'" class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Material de Estudio</h5>
        </div>
        <div class="card-body">
          <p>Revise el siguiente material antes de realizar el examen:</p>
          <div *ngFor="let m of training.materials" class="mb-2">
            <span class="badge bg-info me-2">{{ m.type }}</span>
            <a [href]="'/api/storage/' + m.filepath" target="_blank" class="text-primary">
              {{ m.filename }}
            </a>
          </div>
          <button class="btn btn-primary mt-3" (click)="step = 'exam'">Comenzar Examen</button>
        </div>
      </div>

      <!-- Material skipped if no materials -->
      <div *ngIf="training && (!training.materials || training.materials.length === 0) && step === 'material'">
        <button class="btn btn-primary" (click)="step = 'exam'">Comenzar Examen</button>
      </div>

      <!-- Exam Section -->
      <div *ngIf="step === 'exam' && training" class="card">
        <div class="card-header">
          <h5 class="mb-0">{{ training.title }}</h5>
          <small class="text-muted">Responda una pregunta a la vez</small>
        </div>
        <div class="card-body">
          <div *ngIf="resultMessage" class="alert alert-info">{{ resultMessage }}</div>

          <div *ngIf="currentQuestion() as q" class="mb-4 p-3 border rounded">
            <div class="d-flex justify-content-between">
              <strong class="mb-2 d-block">Pregunta {{ currentQuestionNumber() }} de {{ totalQuestions() }}:</strong>
            </div>
            <p>{{ q.question_text }}</p>

            <div *ngIf="q.materials && q.materials.length > 0" class="mb-3 p-3 bg-light border rounded">
              <div class="small text-muted mb-2">Material de apoyo de esta pregunta</div>
              <div *ngFor="let m of q.materials" class="mb-2">
                <span class="badge bg-info me-2">{{ m.type }}</span>
                <a [href]="'/api/storage/' + m.filepath" target="_blank" class="text-primary">
                  {{ m.filename }}
                </a>
              </div>
            </div>

            <!-- Open question -->
            <div *ngIf="q.type === 'open'">
              <textarea class="form-control" rows="4"
                [(ngModel)]="answers[q.id]"
                placeholder="Escriba su respuesta..."></textarea>
            </div>

            <!-- Yes/No -->
            <div *ngIf="q.type === 'yes_no'">
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" [name]="'q_' + q.id" [value]="'yes'"
                  (change)="selectOption(q, 'yes')" />
                <label class="form-check-label">Si</label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" [name]="'q_' + q.id" [value]="'no'"
                  (change)="selectOption(q, 'no')" />
                <label class="form-check-label">No</label>
              </div>
            </div>

            <!-- Multiple choice -->
            <div *ngIf="q.type === 'multiple_choice' && q.options">
              <div *ngFor="let opt of q.options" class="form-check">
                <input class="form-check-input" type="radio" [name]="'q_' + q.id" [value]="opt.id"
                  [(ngModel)]="answers[q.id]" />
                <label class="form-check-label">{{ opt.option_text }}</label>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4">
            <button class="btn btn-outline-secondary" (click)="previousQuestion()" [disabled]="submitting || isFirstQuestion()">
              Anterior
            </button>
            <div class="text-muted small">
              {{ currentQuestionNumber() }} / {{ totalQuestions() }}
            </div>
            <button class="btn btn-success" (click)="nextOrFinish()" [disabled]="submitting">
              <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ isLastQuestion() ? 'Finalizar' : 'Siguiente' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PublicExamComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  training?: Training;
  loading = true;
  error = '';
  step: 'material' | 'exam' = 'material';
  answers: Record<number, any> = {};
  submitting = false;
  resultMessage = '';
  currentQuestionIndex = 0;

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.loadExam(id);
  }

  loadExam(id: number): void {
    this.loadingService.track(this.trainingService.takeExam(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (training) => {
          this.training = training;
          if (!training.materials || training.materials.length === 0) {
            this.step = 'exam';
          }
          this.currentQuestionIndex = 0;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al cargar el examen.';
        }
      });
  }

  selectOption(question: any, value: string): void {
    if (value === 'yes') {
      const yesOption = question.options?.find((o: any) => o.option_text?.toLowerCase() === 'si');
      this.answers[question.id] = yesOption?.id;
    } else {
      const noOption = question.options?.find((o: any) => o.option_text?.toLowerCase() === 'no');
      this.answers[question.id] = noOption?.id;
    }
  }

  currentQuestion(): Training['questions'] extends (infer Q)[] ? Q | null : any {
    return this.training?.questions?.[this.currentQuestionIndex] ?? null;
  }

  totalQuestions(): number {
    return this.training?.questions?.length ?? 0;
  }

  currentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  isFirstQuestion(): boolean {
    return this.currentQuestionIndex <= 0;
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex >= this.totalQuestions() - 1;
  }

  previousQuestion(): void {
    if (this.isFirstQuestion()) {
      return;
    }

    this.currentQuestionIndex--;
  }

  nextOrFinish(): void {
    if (!this.training) return;

    const q = this.currentQuestion();

    if (!q) {
      return;
    }

    if (!this.isQuestionAnswered(q)) {
      this.resultMessage = 'Debes responder la pregunta actual antes de continuar.';
      return;
    }

    this.resultMessage = '';

    if (!this.isLastQuestion()) {
      this.currentQuestionIndex++;
      return;
    }

    this.submitExam();
  }

  isQuestionAnswered(question: any): boolean {
    const value = this.answers[question.id];

    if (question.type === 'open') {
      return typeof value === 'string' && value.trim() !== '';
    }

    return value !== undefined && value !== null && value !== '';
  }

  submitExam(): void {
    if (!this.training) return;

    const submitAnswers: SubmitAnswer[] = (this.training.questions ?? []).map(q => ({
      question_id: q.id,
      answer_text: q.type === 'open' ? String(this.answers[q.id] ?? '').trim() : undefined,
      selected_option_id: q.type !== 'open' ? Number(this.answers[q.id]) : undefined,
    }));

    this.submitting = true;
    this.loadingService.track(this.trainingService.submitExam(this.training.id, submitAnswers))
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/public/trainings', this.training!.id, 'result']);
        },
        error: (err) => {
          this.resultMessage = err.error?.message || 'Error al enviar respuestas.';
        }
      });
  }
}
