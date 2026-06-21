import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import {
  ParticipantReview,
  TrainingService,
  Training,
  TrainingParticipant,
} from '../../core/services/training.service';

@Component({
  selector: 'app-training-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalShellComponent],
  template: `
    <app-modal-shell
      kicker="Seguimiento"
      [title]="'Resultados: ' + (training?.title || trainingTitle)"
      subtitle="Revisa asistencia, puntajes y estado final sin salir del modulo."
      [showHeaderClose]="isModal"
      [showFooterClose]="isModal"
      [showFooter]="isModal"
      headerVariant="success"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <a *ngIf="!isModal" routerLink="/trainings" class="btn btn-outline-secondary btn-sm">&larr; Capacitaciones</a>
          <span *ngIf="isModal" class="training-results-modal-hint">Vista rapida en modal</span>
        </div>

        <div *ngIf="!training" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
          <div class="mt-3 text-muted">Cargando resultados...</div>
        </div>

        <div *ngIf="training && (!training.participants || training.participants.length === 0)" class="training-results-empty">
          No hay participantes asignados a esta capacitacion.
        </div>

        <div *ngIf="(training?.participants?.length ?? 0) > 0" class="table-responsive">
          <table class="table table-hover align-middle mb-0 training-results-table">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Cedula</th>
                <th>Presentó</th>
                <th>Puntaje</th>
                <th>Resultado</th>
                <th>Completado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of training?.participants ?? []">
                <td class="fw-semibold">{{ $any(p).full_name || $any(p).name }}</td>
                <td>{{ p.document_number }}</td>
                <td>
                  <span *ngIf="presentedLabel(p) === 'Sí'" class="badge bg-success">Sí</span>
                  <span *ngIf="presentedLabel(p) === 'No'" class="badge bg-danger">No</span>
                  <span *ngIf="presentedLabel(p) === 'Pendiente'" class="badge bg-secondary">Pendiente</span>
                </td>
                <td>{{ $any(p.pivot).score !== null ? $any(p.pivot).score + '%' : '-' }}</td>
                <td>
                  <span
                    *ngIf="$any(p.pivot).score !== null"
                    [class]="'badge ' + (participantPassed(p) ? 'bg-success' : 'bg-danger')"
                  >
                    {{ participantPassed(p) ? 'Aprobado' : 'No Aprobado' }}
                  </span>
                  <span *ngIf="$any(p.pivot).score === null" class="badge bg-warning text-dark">Pendiente de revision</span>
                </td>
                <td>{{ $any(p.pivot).completed_at ? ($any(p.pivot).completed_at | date:'short') : '-' }}</td>
                <td>
                  <div class="d-flex flex-wrap gap-2 justify-content-end">
                    <button
                      *ngIf="$any(p.pivot).completed_at"
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      (click)="openReview(p)"
                    >
                      Revisar prueba
                    </button>
                    <button
                      *ngIf="$any(p.pivot).completed_at"
                      type="button"
                      class="btn btn-sm btn-outline-warning"
                      (click)="resetAttempt(p)"
                    >
                      Reabrir intento
                    </button>
                    <span *ngIf="!$any(p.pivot).completed_at">-</span>
                  </div>
                  <div *ngIf="$any(p.pivot).completed_at" class="text-end mt-1">
                    <small class="text-muted">
                      Evaluado con: {{ training?.passing_score ?? 70 }}%
                    </small>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="reviewingParticipant" class="card mt-4">
          <div class="card-header d-flex justify-content-between align-items-center gap-2">
            <div>
              <strong>Revision de prueba</strong>
              <div class="small text-muted">
                {{ reviewingParticipant.full_name }} | {{ reviewingParticipant.document_number }}
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="closeReview()">
              Cerrar
            </button>
          </div>

          <div class="card-body">
            <div *ngIf="reviewLoading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status"></div>
              <div class="mt-2 text-muted">Cargando revision...</div>
            </div>

            <div *ngIf="reviewError" class="alert alert-danger">{{ reviewError }}</div>

            <div *ngIf="reviewData && !reviewLoading">
              <div class="alert alert-info py-2">
                Califica cada pregunta abierta de forma individual. El puntaje final se recalcula cuando todas las preguntas tengan nota.
              </div>

              <div class="row g-3 mb-4">
                <div class="col-12">
                  <label class="form-label">Observaciones</label>
                  <textarea
                    class="form-control"
                    rows="3"
                    [(ngModel)]="reviewObservations"
                    name="reviewObservations"
                    placeholder="Notas de la revision manual"
                  ></textarea>
                </div>
              </div>

              <div class="mb-3">
                <h6 class="mb-3">Respuestas registradas</h6>
                <div *ngFor="let q of reviewData.questions" class="border rounded p-3 mb-2">
                  <div class="d-flex justify-content-between gap-3">
                    <div class="fw-semibold">{{ q.order }}. {{ q.question_text }}</div>
                    <span class="badge bg-light text-dark text-uppercase">{{ questionTypeLabel(q.type) }}</span>
                  </div>

                  <div class="mt-2">
                    <div *ngIf="q.answer?.answer_text; else noTextAnswer">
                      <span class="text-muted d-block small">Respuesta abierta</span>
                      <div>{{ q.answer?.answer_text }}</div>
                    </div>
                    <ng-template #noTextAnswer>
                      <div *ngIf="q.answer?.selected_option_text; else noAnswer">
                        <span class="text-muted d-block small">Opcion seleccionada</span>
                        <div>{{ q.answer?.selected_option_text }}</div>
                      </div>
                    </ng-template>
                    <ng-template #noAnswer>
                      <div class="text-muted">Sin respuesta registrada.</div>
                    </ng-template>
                  </div>

                  <div class="mt-3" *ngIf="q.type === 'open'">
                    <label class="form-label mb-1">Puntaje de esta pregunta</label>
                    <input
                      type="number"
                      class="form-control"
                      min="0"
                      max="100"
                      step="0.01"
                      [name]="'reviewScore_' + q.id"
                      [(ngModel)]="reviewScores[q.id]"
                      [disabled]="q.answer?.score !== null && q.answer?.score !== undefined"
                      placeholder="0 - 100"
                    />
                    <small class="text-muted d-block mt-1">
                      <span *ngIf="q.answer?.score !== null && q.answer?.score !== undefined">
                        Esta pregunta ya fue calificada y su puntaje queda bloqueado.
                      </span>
                      <span *ngIf="q.answer?.score === null || q.answer?.score === undefined">
                        Este valor afecta solo a esta pregunta.
                      </span>
                    </small>
                  </div>

                  <div class="mt-3" *ngIf="q.type !== 'open'">
                    <span class="badge bg-secondary">Calificacion automatica</span>
                    <span *ngIf="q.answer?.score !== null" class="ms-2 badge bg-light text-dark">
                      {{ q.answer?.score }}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                *ngIf="hasOpenQuestions()"
                type="button"
                class="btn btn-primary"
                (click)="saveReview()"
                [disabled]="reviewSaving || !hasPendingOpenQuestions()"
              >
                <span *ngIf="reviewSaving" class="spinner-border spinner-border-sm me-1"></span>
                Guardar calificacion
              </button>
              <div *ngIf="hasOpenQuestions() && !hasPendingOpenQuestions()" class="text-muted mt-2">
                Todas las preguntas abiertas ya tienen puntaje guardado.
              </div>
              <div *ngIf="!hasOpenQuestions()" class="text-muted">
                Esta prueba no tiene preguntas abiertas pendientes de revision.
              </div>
            </div>
          </div>
        </div>
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

    .training-results-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      border-radius: 1.5rem;
      overflow: hidden;
      background: linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
    }

    .training-results-shell--modal {
      height: 100%;
      max-height: 100%;
      min-width: min(100%, 980px);
    }

    .training-results-hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 3.5rem 1.25rem 1.4rem;
      color: #fff;
      background: linear-gradient(135deg, var(--brand-blue, #1462ff), var(--brand-cyan, #1dbbd6));
    }

    .training-results-kicker {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      opacity: 0.82;
    }

    .training-results-title {
      font-size: 1.35rem;
      font-weight: 800;
    }

    .training-results-subtitle {
      opacity: 0.88;
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

    .training-results-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.35rem;
      background: rgba(255, 255, 255, 0.96);
    }

    .training-results-modal-hint {
      color: var(--muted, #55617a);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .training-results-empty {
      padding: 1.15rem;
      border-radius: 1rem;
      color: var(--muted, #55617a);
      background: rgba(20, 98, 255, 0.04);
      border: 1px dashed rgba(20, 98, 255, 0.18);
    }

    .training-results-table {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1rem;
      overflow: hidden;
      background: #fff;
    }

    .training-results-table thead th {
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 0;
    }

    .training-results-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
    }

    @media (max-width: 576px) {
      .training-results-hero {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class TrainingResultsComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly activeModal = inject(NgbActiveModal, { optional: true });

  @Input() trainingIdInput?: number;
  @Input() trainingTitleInput?: string;

  training?: Training;
  trainingTitle = '';
  reviewingParticipant: TrainingParticipant | null = null;
  reviewData: ParticipantReview | null = null;
  reviewLoading = false;
  reviewSaving = false;
  reviewError = '';
  reviewObservations = '';
  reviewScores: Record<number, string> = {};

  get isModal(): boolean {
    return !!this.activeModal;
  }

  ngOnInit(): void {
    const id = this.trainingIdInput ?? +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.trainingTitle = this.trainingTitleInput ?? '';

    this.loadingService.track(this.trainingService.get(id)).subscribe({
      next: (t) => (this.training = t)
    });
  }

  resetAttempt(participant: TrainingParticipant): void {
    if (!this.training) return;

    const name = participant.full_name || (participant as any).name || 'este participante';
    const confirmed = window.confirm(
      `Reabrir el intento de ${name}? Esto borrara sus respuestas y le permitira volver a presentar la prueba.`
    );

    if (!confirmed) return;

    this.loadingService.track(this.trainingService.resetParticipantAttempt(this.training.id, participant.id)).subscribe({
      next: () => this.ngOnInit()
    });
  }

  openReview(participant: TrainingParticipant): void {
    if (!this.training) return;

    this.reviewingParticipant = participant;
    this.reviewData = null;
    this.reviewError = '';
    this.reviewLoading = true;
    this.reviewObservations = participant.pivot.observations ?? '';
    this.reviewScores = {};

    this.loadingService.track(this.trainingService.getParticipantReview(this.training.id, participant.id)).subscribe({
      next: (review) => {
        this.reviewData = review;
        this.reviewObservations = review.pivot.observations ?? '';
        this.reviewScores = review.questions.reduce((acc, question) => {
          if (question.type === 'open') {
            acc[question.id] = question.answer?.score === null || question.answer?.score === undefined
              ? ''
              : String(question.answer.score);
          }

          return acc;
        }, {} as Record<number, string>);
        this.reviewLoading = false;
      },
      error: (err) => {
        this.reviewError = err.error?.message || 'No se pudo cargar la revision.';
        this.reviewLoading = false;
      }
    });
  }

  saveReview(): void {
    if (!this.training || !this.reviewingParticipant) return;

    const openQuestions = this.reviewData?.questions.filter((question) => question.type === 'open') ?? [];
    try {
      const answers = openQuestions.map((question) => {
        const rawScore = String(this.reviewScores[question.id] ?? '').trim();

        if (rawScore !== '' && Number.isNaN(Number(rawScore))) {
          throw new Error(`El puntaje de la pregunta ${question.order} no es valido.`);
        }

        return {
          question_id: question.id,
          score: rawScore === '' ? null : Number(rawScore),
        };
      });

      this.reviewSaving = true;
      this.reviewError = '';

      const payload = {
        answers,
        observations: this.reviewObservations.trim() === '' ? null : this.reviewObservations.trim(),
      };

      this.loadingService.track(
        this.trainingService.updateParticipantReview(this.training.id, this.reviewingParticipant.id, payload)
      ).subscribe({
        next: () => {
          this.reviewSaving = false;
          this.ngOnInit();
          this.openReview(this.reviewingParticipant!);
        },
        error: (err) => {
          this.reviewSaving = false;
          this.reviewError = err.error?.message || 'No se pudo guardar la revision.';
        }
      });
    } catch (error) {
      this.reviewSaving = false;
      this.reviewError = error instanceof Error ? error.message : 'No se pudo validar la calificacion.';
    }
  }

  closeReview(): void {
    this.reviewingParticipant = null;
    this.reviewData = null;
    this.reviewError = '';
    this.reviewObservations = '';
    this.reviewScores = {};
  }

  questionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      multiple_choice: 'Opcion multiple',
      yes_no: 'Si / No',
    };

    return labels[type] || type;
  }

  hasOpenQuestions(): boolean {
    return this.reviewData?.questions.some((question) => question.type === 'open') ?? false;
  }

  hasPendingOpenQuestions(): boolean {
    return this.reviewData?.questions.some(
      (question) =>
        question.type === 'open' &&
        (question.answer?.score === null || question.answer?.score === undefined)
    ) ?? false;
  }

  participantPassed(participant: TrainingParticipant): boolean {
    const passed = participant.pivot.passed;

    if (passed !== null && passed !== undefined) {
      return passed;
    }

    return (participant.pivot.score ?? 0) >= (this.training?.passing_score ?? 70);
  }

  presentedLabel(participant: TrainingParticipant): 'Sí' | 'No' | 'Pendiente' {
    const attended = (participant.pivot as any).attended;

    if (attended === null || attended === undefined) {
      return 'Pendiente';
    }

    return attended === true || attended === 1 || attended === '1' ? 'Sí' : 'No';
  }

  closeModal(): void {
    this.activeModal?.dismiss('close');
  }
}
