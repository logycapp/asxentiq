import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Tooltip } from 'bootstrap';

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
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showFooter]="false"
      size="xl"
      headerVariant="success"
      (closeRequested)="closeModal()"
    >
      <div modal-body>
        <div *ngIf="!training" class="text-center py-4">
          <div class="text-on-surface-variant font-body-md">Cargando resultados...</div>
        </div>

        <div *ngIf="training && (!training.participants || training.participants.length === 0)" class="text-center py-4">
          <div class="text-on-surface-variant font-body-md">No hay participantes asignados a esta capacitacion.</div>
        </div>

        <div *ngIf="(training?.participants?.length ?? 0) > 0" class="card glass-card dashboard-table-card border-0 rounded-4 overflow-hidden mt-4">
          <div class="p-3 p-md-4 border-bottom border-white/10">
            <div class="row g-3 align-items-center justify-content-between">
              <div class="col-12 col-xl-auto">
                <div class="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn btn-outline-light fw-semibold btn-sm d-inline-flex align-items-center gap-1"
                    (click)="clearParticipantFilters()"
                  >
                    <span class="material-symbols-outlined text-[16px]">filter_alt_off</span>
                    Limpiar filtros
                  </button>
                </div>
              </div>
              <div class="col-12 col-xl-auto">
                <div style="width: min(100%, 360px);">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-transparent border-white/10 text-on-surface-variant">
                      <span class="material-symbols-outlined text-[18px]">search</span>
                    </span>
                    <input
                      class="form-control bg-transparent border-white/10 text-on-surface dashboard-table-search"
                      type="search"
                      placeholder="Buscar participante..."
                      [(ngModel)]="participantSearchTerm"
                      name="participantSearchTerm"
                      (ngModelChange)="applyParticipantFilters()"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="table-responsive results-table-wrap">
          <table class="table table-hover align-middle mb-0 dashboard-table results-table">
            <thead class="results-table-head">
              <tr class="border-bottom border-white/10">
                <th class="ps-3 py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                  <button type="button" class="sort-trigger results-sort-trigger" (click)="sortParticipantsBy('name')">
                    Participante <span class="material-symbols-outlined sort-icon">{{ getParticipantSortIcon('name') }}</span>
                  </button>
                </th>
                <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                  <button type="button" class="sort-trigger results-sort-trigger" (click)="sortParticipantsBy('document_number')">
                    Cedula <span class="material-symbols-outlined sort-icon">{{ getParticipantSortIcon('document_number') }}</span>
                  </button>
                </th>
                <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                  <button type="button" class="sort-trigger results-sort-trigger" (click)="sortParticipantsBy('presented')">
                    Presento <span class="material-symbols-outlined sort-icon">{{ getParticipantSortIcon('presented') }}</span>
                  </button>
                </th>
                <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                  <button type="button" class="sort-trigger results-sort-trigger" (click)="sortParticipantsBy('score')">
                    Puntaje <span class="material-symbols-outlined sort-icon">{{ getParticipantSortIcon('score') }}</span>
                  </button>
                </th>
                <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                  <button type="button" class="sort-trigger results-sort-trigger" (click)="sortParticipantsBy('result')">
                    Resultado <span class="material-symbols-outlined sort-icon">{{ getParticipantSortIcon('result') }}</span>
                  </button>
                </th>
                <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                  <button type="button" class="sort-trigger results-sort-trigger" (click)="sortParticipantsBy('completed_at')">
                    Completado <span class="material-symbols-outlined sort-icon">{{ getParticipantSortIcon('completed_at') }}</span>
                  </button>
                </th>
                <th class="py-3 font-label-sm text-on-surface-variant text-uppercase text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of paginatedParticipants" class="border-bottom border-white/5">
                <td class="py-3 fw-semibold text-on-surface">{{ $any(p).full_name || $any(p).name }}</td>
                <td class="py-3 text-on-surface-variant">{{ p.document_number }}</td>
                <td class="py-3">
                  <span *ngIf="presentedLabel(p) === 'Sí'" class="badge rounded-pill px-3 py-2 participant-presented-badge participant-presented-yes">Si</span>
                  <span *ngIf="presentedLabel(p) === 'No'" class="badge rounded-pill px-3 py-2 participant-presented-badge participant-presented-no">No</span>
                  <span *ngIf="presentedLabel(p) === 'Pendiente'" class="badge rounded-pill px-3 py-2 participant-presented-badge participant-presented-pending">Pendiente</span>
                </td>
                <td class="py-3 text-on-surface-variant">{{ p.score !== null && p.score !== undefined ? p.score + '%' : '-' }}</td>
                <td class="py-3">
                  <span *ngIf="p.score !== null && p.score !== undefined" class="badge rounded-pill px-3 py-2 participant-result-badge" [ngClass]="participantPassed(p) ? 'participant-result-approved' : 'participant-result-rejected'">
                    {{ participantPassed(p) ? 'Aprobado' : 'No Aprobado' }}
                  </span>
                  <span *ngIf="p.score === null || p.score === undefined" class="badge rounded-pill px-3 py-2 participant-result-badge participant-result-pending">Pendiente de revision</span>
                </td>
                <td class="py-3 text-on-surface-variant">{{ p.completed_at ? (p.completed_at | date:'short') : '-' }}</td>
                <td class="py-3 text-end">
                  <div class="dashboard-action-group">
                    <button
                      *ngIf="p.completed_at"
                      type="button"
                      class="btn btn-sm btn-outline-info fw-semibold d-inline-flex align-items-center gap-1"
                      (click)="openReview(p)"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="Revisar resultado"
                      aria-label="Revisar resultado"
                    >
                      <span class="material-symbols-outlined text-[16px]">rate_review</span>Revisar
                    </button>
                    <button
                      *ngIf="p.completed_at"
                      type="button"
                      class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1"
                      (click)="resetAttempt(p)"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="Reabrir intento"
                      aria-label="Reabrir intento"
                    >
                      <span class="material-symbols-outlined text-[16px]">replay</span>Reabrir
                    </button>
                    <span *ngIf="!p.completed_at" class="text-on-surface-variant font-label-sm">-</span>
                  </div>
                  <div *ngIf="p.completed_at" class="mt-1">
                    <small class="text-on-surface-variant font-label-sm">
                      Evaluado con: {{ training?.passing_score ?? 70 }}%
                    </small>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <div class="px-3 px-md-4 py-3 border-top border-white/10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <p class="text-on-surface-variant font-label-sm mb-0">
              Mostrando {{ participantStartRecord }}-{{ participantEndRecord }} de {{ filteredParticipants.length }} participantes
            </p>
            <nav aria-label="Paginacion de participantes">
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" [class.disabled]="participantPage === 1">
                  <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onParticipantPageChange(1)" aria-label="Primera">
                    <span class="material-symbols-outlined text-[16px]">first_page</span>
                  </button>
                </li>
                <li class="page-item" [class.disabled]="participantPage === 1">
                  <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onParticipantPageChange(participantPage - 1)" aria-label="Anterior">
                    <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                </li>
                <li class="page-item" *ngFor="let p of participantPageNumbers">
                  <button class="page-link bg-transparent border-white/10 text-on-surface" [class.active]="participantPage === p" (click)="onParticipantPageChange(p)">{{ p }}</button>
                </li>
                <li class="page-item" [class.disabled]="participantPage === participantTotalPages">
                  <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onParticipantPageChange(participantPage + 1)" aria-label="Siguiente">
                    <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </li>
                <li class="page-item" [class.disabled]="participantPage === participantTotalPages">
                  <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onParticipantPageChange(participantTotalPages)" aria-label="Ultima">
                    <span class="material-symbols-outlined text-[16px]">last_page</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div *ngIf="(training?.participants?.length ?? 0) > 0 && filteredParticipants.length === 0" class="text-center py-4">
          <div class="text-on-surface-variant font-body-md">No se encontraron participantes.</div>
        </div>

        <div *ngIf="reviewingParticipant" class="border border-white/10 rounded-3 p-3 mt-4">
          <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h6 class="text-on-surface mb-1">Revision de prueba</h6>
              <div class="font-label-sm text-on-surface-variant">
                {{ reviewingParticipant.full_name }} | {{ reviewingParticipant.document_number }}
              </div>
            </div>
            <button type="button" class="btn btn-outline-light fw-semibold btn-sm d-inline-flex align-items-center gap-1" (click)="closeReview()">
              <span class="material-symbols-outlined text-[16px]">close</span>Cerrar
            </button>
          </div>

          <div>
            <div *ngIf="reviewLoading" class="text-center py-4">
              <div class="text-on-surface-variant font-body-md">Cargando revision...</div>
            </div>

            <div *ngIf="reviewError" class="alert alert-danger">{{ reviewError }}</div>

            <div *ngIf="reviewData && !reviewLoading">
              <div class="alert alert-info py-2 font-label-sm">
                <span class="material-symbols-outlined text-[16px] align-middle me-1">info</span>
                Califica cada pregunta abierta de forma individual. El puntaje final se recalcula cuando todas las preguntas tengan nota.
              </div>

              <div class="row g-3 mb-4">
                <div class="col-12">
                  <label class="form-label small text-on-surface-variant">Observaciones</label>
                  <textarea
                    class="form-control bg-transparent border-white/10 text-on-surface"
                    rows="3"
                    [(ngModel)]="reviewObservations"
                    name="reviewObservations"
                    placeholder="Notas de la revision manual"
                  ></textarea>
                </div>
              </div>

              <div class="mb-3">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                  <h6 class="text-on-surface mb-0">Respuestas registradas</h6>
                  <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-outline-light fw-semibold btn-sm d-inline-flex align-items-center gap-1" (click)="clearReviewFilters()">
                      <span class="material-symbols-outlined text-[16px]">filter_alt_off</span>
                      Limpiar filtros
                    </button>
                  </div>
                </div>

                <div class="row g-3 align-items-end mb-3">
                  <div class="col-12 col-lg-5">
                    <label class="form-label small text-on-surface-variant">Buscar</label>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-transparent border-white/10 text-on-surface-variant">
                        <span class="material-symbols-outlined text-[18px]">search</span>
                      </span>
                      <input
                        class="form-control bg-transparent border-white/10 text-on-surface dashboard-table-search"
                        type="search"
                        placeholder="Buscar pregunta o respuesta..."
                        [(ngModel)]="reviewSearchTerm"
                        name="reviewSearchTerm"
                        (ngModelChange)="applyReviewFilters()"
                      />
                    </div>
                  </div>
                  <div class="col-12 col-lg-3">
                    <label class="form-label small text-on-surface-variant">Tipo</label>
                    <select
                      class="form-select bg-transparent border-white/10 text-on-surface"
                      [(ngModel)]="reviewTypeFilter"
                      name="reviewTypeFilter"
                      (ngModelChange)="applyReviewFilters()"
                    >
                      <option value="all">Todos</option>
                      <option value="multiple_choice">Opcion multiple</option>
                      <option value="yes_no">Si / No</option>
                    </select>
                  </div>
                  <div class="col-12 col-lg-3">
                    <label class="form-label small text-on-surface-variant">Calificacion</label>
                    <select
                      class="form-select bg-transparent border-white/10 text-on-surface"
                      [(ngModel)]="reviewScoreFilter"
                      name="reviewScoreFilter"
                      (ngModelChange)="applyReviewFilters()"
                    >
                      <option value="all">Todas</option>
                      <option value="pending">Pendientes</option>
                      <option value="graded">Calificadas</option>
                    </select>
                  </div>
                  <div class="col-12 col-lg-1 text-lg-end">
                    <div class="text-on-surface-variant font-label-sm">
                      {{ reviewStartRecord }}-{{ reviewEndRecord }} de {{ filteredReviewQuestions.length }}
                    </div>
                  </div>
                </div>

                <div class="table-responsive review-table-wrap">
                  <table class="table table-hover align-middle mb-0 dashboard-table review-table">
                    <thead class="review-table-head">
                      <tr class="border-bottom border-white/10">
                        <th class="ps-3 py-3 font-label-sm text-on-surface-variant text-uppercase">#</th>
                        <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                          <button type="button" class="sort-trigger review-sort-trigger" (click)="sortReviewBy('order')">
                            Pregunta <span class="material-symbols-outlined sort-icon">{{ getReviewSortIcon('order') }}</span>
                          </button>
                        </th>
                        <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                          <button type="button" class="sort-trigger review-sort-trigger" (click)="sortReviewBy('type')">
                            Tipo <span class="material-symbols-outlined sort-icon">{{ getReviewSortIcon('type') }}</span>
                          </button>
                        </th>
                        <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                          <button type="button" class="sort-trigger review-sort-trigger" (click)="sortReviewBy('answer')">
                            Respuesta <span class="material-symbols-outlined sort-icon">{{ getReviewSortIcon('answer') }}</span>
                          </button>
                        </th>
                        <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                          <button type="button" class="sort-trigger review-sort-trigger" (click)="sortReviewBy('score')">
                            Puntaje <span class="material-symbols-outlined sort-icon">{{ getReviewSortIcon('score') }}</span>
                          </button>
                        </th>
                        <th class="pe-3 py-3 font-label-sm text-on-surface-variant text-uppercase text-end">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let q of paginatedReviewQuestions; let i = index" class="border-bottom border-white/5">
                        <td class="ps-3 py-3 font-mono text-on-surface">{{ q.order }}</td>
                        <td class="py-3">
                          <div class="fw-semibold text-on-surface">{{ q.question_text }}</div>
                        </td>
                        <td class="py-3">
                          <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 text-uppercase">{{ questionTypeLabel(q.type) }}</span>
                        </td>
                        <td class="py-3">
                          <div *ngIf="q.answer?.answer_text; else selectedAnswerTemplate">
                            <span class="text-on-surface-variant d-block font-label-sm">Respuesta abierta</span>
                            <div class="text-on-surface">{{ q.answer?.answer_text }}</div>
                          </div>
                          <ng-template #selectedAnswerTemplate>
                            <div *ngIf="q.answer?.selected_option_text; else noAnswerTemplate">
                              <span class="text-on-surface-variant d-block font-label-sm">Opcion seleccionada</span>
                              <div class="text-on-surface">{{ q.answer?.selected_option_text }}</div>
                            </div>
                          </ng-template>
                          <ng-template #noAnswerTemplate>
                            <div class="text-on-surface-variant">Sin respuesta registrada.</div>
                          </ng-template>
                        </td>
                        <td class="py-3">
                          <div *ngIf="q.type === 'open'; else autoScoreTemplate">
                            <label class="form-label small text-on-surface-variant mb-1">Puntaje de esta pregunta</label>
                            <input
                              type="number"
                              class="form-control bg-transparent border-white/10 text-on-surface"
                              min="0"
                              max="100"
                              step="0.01"
                              [name]="'reviewScore_' + q.id"
                              [(ngModel)]="reviewScores[q.id]"
                              [disabled]="q.answer?.score !== null && q.answer?.score !== undefined"
                              placeholder="0 - 100"
                            />
                            <small class="text-on-surface-variant d-block mt-1 font-label-sm">
                              <span *ngIf="q.answer?.score !== null && q.answer?.score !== undefined">
                                Esta pregunta ya fue calificada y su puntaje queda bloqueado.
                              </span>
                              <span *ngIf="q.answer?.score === null || q.answer?.score === undefined">
                                Este valor afecta solo a esta pregunta.
                              </span>
                            </small>
                          </div>
                          <ng-template #autoScoreTemplate>
                            <span class="badge rounded-pill bg-primary/10 text-primary border border-primary/20 px-2 py-1">Calificacion automatica</span>
                            <span *ngIf="q.answer?.score !== null" class="ms-2 badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1">
                              {{ q.answer?.score }}%
                            </span>
                          </ng-template>
                        </td>
                        <td class="pe-3 py-3 text-end">
                          <span *ngIf="q.type === 'open' && (q.answer?.score === null || q.answer?.score === undefined)" class="badge rounded-pill bg-chart-yellow/10 text-chart-yellow border border-chart-yellow/20 px-3 py-2">
                            Pendiente
                          </span>
                          <span *ngIf="q.type === 'open' && q.answer?.score !== null && q.answer?.score !== undefined" class="badge rounded-pill bg-chart-green/10 text-chart-green border border-chart-green/20 px-3 py-2">
                            Calificada
                          </span>
                          <span *ngIf="q.type !== 'open'" class="badge rounded-pill bg-primary/10 text-primary border border-primary/20 px-3 py-2">
                            Automatica
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
                  <p class="text-on-surface-variant font-label-sm mb-0">
                    Mostrando {{ reviewStartRecord }}-{{ reviewEndRecord }} de {{ filteredReviewQuestions.length }} preguntas
                  </p>
                  <nav aria-label="Paginacion de respuestas">
                    <ul class="pagination pagination-sm mb-0">
                      <li class="page-item" [class.disabled]="reviewPage === 1">
                        <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onReviewPageChange(1)" aria-label="Primera">
                          <span class="material-symbols-outlined text-[16px]">first_page</span>
                        </button>
                      </li>
                      <li class="page-item" [class.disabled]="reviewPage === 1">
                        <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onReviewPageChange(reviewPage - 1)" aria-label="Anterior">
                          <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                      </li>
                      <li class="page-item" *ngFor="let p of reviewPageNumbers">
                        <button class="page-link bg-transparent border-white/10 text-on-surface" [class.active]="reviewPage === p" (click)="onReviewPageChange(p)">{{ p }}</button>
                      </li>
                      <li class="page-item" [class.disabled]="reviewPage === reviewTotalPages">
                        <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onReviewPageChange(reviewPage + 1)" aria-label="Siguiente">
                          <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </li>
                      <li class="page-item" [class.disabled]="reviewPage === reviewTotalPages">
                        <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onReviewPageChange(reviewTotalPages)" aria-label="Ultima">
                          <span class="material-symbols-outlined text-[16px]">last_page</span>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>

              <button
                *ngIf="hasOpenQuestions()"
                type="button"
                class="btn btn-primary fw-semibold d-inline-flex align-items-center gap-1"
                (click)="saveReview()"
                [disabled]="reviewSaving || !hasPendingOpenQuestions()"
              >
                <span *ngIf="reviewSaving" class="spinner-border spinner-border-sm"></span>
                Guardar calificacion
              </button>
              <div *ngIf="hasOpenQuestions() && !hasPendingOpenQuestions()" class="text-on-surface-variant mt-2 font-label-sm">
                Todas las preguntas abiertas ya tienen puntaje guardado.
              </div>
              <div *ngIf="!hasOpenQuestions()" class="text-on-surface-variant font-label-sm">
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
      display: block;
    }

    :host .review-table-head th {
      font-size: 0.72rem;
      line-height: 1.1;
      letter-spacing: 0.08em;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host .review-sort-trigger {
      width: 100%;
      min-height: 1.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.4rem;
      padding: 0;
      white-space: nowrap;
      line-height: 1;
    }

    :host .review-sort-trigger .sort-icon {
      font-size: 18px !important;
      flex: 0 0 auto;
    }

    :host .results-table {
      min-width: 1180px;
    }

    :host .results-table-wrap {
      overflow-x: auto;
    }

    :host .results-table-head th {
      font-size: 0.72rem;
      line-height: 1.1;
      letter-spacing: 0.08em;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host .results-sort-trigger {
      width: 100%;
      min-height: 1.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.4rem;
      padding: 0;
      white-space: nowrap;
      line-height: 1;
    }

    :host .results-sort-trigger .sort-icon {
      font-size: 18px !important;
      flex: 0 0 auto;
    }

    :host .participant-result-badge {
      min-width: 8.5rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-align: center;
      border-width: 1px;
    }

    :host .participant-presented-badge {
      min-width: 7.5rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-align: center;
      border-width: 1px;
    }

    :host .participant-presented-yes {
      background: rgba(34, 197, 94, 0.18);
      border-color: rgba(34, 197, 94, 0.42);
      color: #86efac;
    }

    :host .participant-presented-no {
      background: rgba(239, 68, 68, 0.18);
      border-color: rgba(239, 68, 68, 0.42);
      color: #fca5a5;
    }

    :host .participant-presented-pending {
      background: rgba(148, 163, 184, 0.18);
      border-color: rgba(148, 163, 184, 0.38);
      color: #cbd5e1;
    }

    :host .participant-result-approved {
      background: rgba(34, 197, 94, 0.18);
      border-color: rgba(34, 197, 94, 0.42);
      color: #86efac;
    }

    :host .participant-result-rejected {
      background: rgba(239, 68, 68, 0.18);
      border-color: rgba(239, 68, 68, 0.42);
      color: #fca5a5;
    }

    :host .participant-result-pending {
      background: rgba(245, 158, 11, 0.18);
      border-color: rgba(245, 158, 11, 0.42);
      color: #fcd34d;
    }

    @media (max-width: 767.98px) {
      :host .results-table {
        min-width: 920px;
      }
    }

    :host-context(.light) .review-table-head th {
      color: #334155;
    }

    :host-context(.light) .review-sort-trigger {
      color: #1e293b;
    }

    :host-context(.light) .review-sort-trigger:hover,
    :host-context(.light) .review-sort-trigger:focus-visible {
      color: #0457bf;
    }

    :host-context(.light) .results-table-head th {
      color: #334155;
    }

    :host-context(.light) .results-sort-trigger {
      color: #1e293b;
    }

    :host-context(.light) .results-sort-trigger:hover,
    :host-context(.light) .results-sort-trigger:focus-visible {
      color: #0457bf;
    }

    :host-context(.light) .participant-presented-yes {
      background: rgba(34, 197, 94, 0.12);
      border-color: rgba(34, 197, 94, 0.28);
      color: #166534;
    }

    :host-context(.light) .participant-presented-no {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.28);
      color: #b91c1c;
    }

    :host-context(.light) .participant-presented-pending {
      background: rgba(148, 163, 184, 0.12);
      border-color: rgba(148, 163, 184, 0.28);
      color: #475569;
    }

    :host-context(.light) .participant-result-approved {
      background: rgba(34, 197, 94, 0.12);
      border-color: rgba(34, 197, 94, 0.28);
      color: #166534;
    }

    :host-context(.light) .participant-result-rejected {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.28);
      color: #b91c1c;
    }

    :host-context(.light) .participant-result-pending {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.28);
      color: #b45309;
    }
  `]
})
export class TrainingResultsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly activeModal: { close: (s: string) => void; dismiss: (s: string) => void } | null = null;
  private tooltipInstances = new Map<HTMLElement, Tooltip>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

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
  participantSearchTerm = '';
  participantSortKey: 'name' | 'document_number' | 'presented' | 'score' | 'result' | 'completed_at' = 'name';
  participantSortDir: 'asc' | 'desc' = 'asc';
  participantPage = 1;
  participantPageSize = 10;
  reviewSearchTerm = '';
  reviewTypeFilter: 'all' | 'open' | 'multiple_choice' | 'yes_no' = 'all';
  reviewScoreFilter: 'all' | 'pending' | 'graded' = 'all';
  reviewSortKey: 'order' | 'question_text' | 'type' | 'answer' | 'score' = 'order';
  reviewSortDir: 'asc' | 'desc' = 'asc';
  reviewPage = 1;
  reviewPageSize = 10;

  get isModal(): boolean {
    return !!this.activeModal;
  }

  ngOnInit(): void {
    const id = this.trainingIdInput ?? +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.trainingTitle = this.trainingTitleInput ?? '';

    this.loadingService.track(this.trainingService.get(id)).subscribe({
      next: (t) => {
        this.training = t;
        this.scheduleTooltipRefresh();
      }
    });
  }

  ngAfterViewInit(): void {
    this.refreshTooltips();
  }

  ngOnDestroy(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
      this.tooltipRefreshTimer = null;
    }

    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();
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
    this.reviewObservations = participant.observations ?? '';
    this.reviewScores = {};
    this.clearReviewFilters();

    this.loadingService.track(this.trainingService.getParticipantReview(this.training.id, participant.id)).subscribe({
      next: (review) => {
        this.reviewData = review;
        this.reviewObservations = review.participant.observations ?? '';
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

  applyReviewFilters(): void {
    this.reviewPage = 1;
    this.scheduleTooltipRefresh();
  }

  applyParticipantFilters(): void {
    this.participantPage = 1;
    this.scheduleTooltipRefresh();
  }

  get filteredParticipants(): TrainingParticipant[] {
    const participants = this.training?.participants ?? [];
    let result = [...participants];
    const term = this.participantSearchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((participant) => {
        const fullName = (participant.full_name || (participant as any).name || '').toString().toLowerCase();
        const documentNumber = (participant.document_number || '').toString().toLowerCase();
        const presented = this.presentedLabel(participant).toLowerCase();
        const score = String(participant.score ?? '').toLowerCase();
        const resultLabel = this.participantPassed(participant) ? 'aprobado' : 'no aprobado';
        const completedAt = String(participant.completed_at ?? '').toLowerCase();

        return [fullName, documentNumber, presented, score, resultLabel, completedAt].some((value) => value.includes(term));
      });
    }

    result.sort((left, right) => {
      let comparison = 0;

      switch (this.participantSortKey) {
        case 'name':
          comparison = (left.full_name || (left as any).name || '').localeCompare((right.full_name || (right as any).name || ''), 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'document_number':
          comparison = String(left.document_number ?? '').localeCompare(String(right.document_number ?? ''), 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'presented':
          comparison = this.presentedLabel(left).localeCompare(this.presentedLabel(right), 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'score':
          comparison = this.participantScoreValue(left) - this.participantScoreValue(right);
          break;
        case 'result':
          comparison = this.participantResultValue(left).localeCompare(this.participantResultValue(right), 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'completed_at':
          comparison = String(left.completed_at ?? '').localeCompare(String(right.completed_at ?? ''), 'es', { numeric: true, sensitivity: 'base' });
          break;
      }

      return this.participantSortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  clearParticipantFilters(): void {
    this.participantSearchTerm = '';
    this.participantSortKey = 'name';
    this.participantSortDir = 'asc';
    this.participantPage = 1;
    this.scheduleTooltipRefresh();
  }

  sortParticipantsBy(key: 'name' | 'document_number' | 'presented' | 'score' | 'result' | 'completed_at'): void {
    if (this.participantSortKey === key) {
      this.participantSortDir = this.participantSortDir === 'asc' ? 'desc' : 'asc';
      this.participantPage = 1;
      this.scheduleTooltipRefresh();
      return;
    }

    this.participantSortKey = key;
    this.participantSortDir = 'asc';
    this.participantPage = 1;
    this.scheduleTooltipRefresh();
  }

  getParticipantSortIcon(key: 'name' | 'document_number' | 'presented' | 'score' | 'result' | 'completed_at'): string {
    if (this.participantSortKey !== key) {
      return 'unfold_more';
    }

    return this.participantSortDir === 'asc' ? 'north' : 'south';
  }

  get participantTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredParticipants.length / this.participantPageSize));
  }

  get paginatedParticipants(): TrainingParticipant[] {
    const start = (this.participantPage - 1) * this.participantPageSize;
    return this.filteredParticipants.slice(start, start + this.participantPageSize);
  }

  get participantStartRecord(): number {
    return this.filteredParticipants.length === 0 ? 0 : (this.participantPage - 1) * this.participantPageSize + 1;
  }

  get participantEndRecord(): number {
    return Math.min(this.participantPage * this.participantPageSize, this.filteredParticipants.length);
  }

  get participantPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.participantPage - 2);
    const end = Math.min(this.participantTotalPages, this.participantPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onParticipantPageChange(page: number): void {
    if (page >= 1 && page <= this.participantTotalPages) {
      this.participantPage = page;
      this.scheduleTooltipRefresh();
    }
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
    this.clearReviewFilters();
  }

  get filteredReviewQuestions(): ParticipantReview['questions'] {
    const questions = this.reviewData?.questions ?? [];
    let result = [...questions];
    const term = this.reviewSearchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((question) =>
        (question.question_text || '').toLowerCase().includes(term) ||
        this.questionTypeLabel(question.type).toLowerCase().includes(term) ||
        (question.answer?.answer_text || '').toLowerCase().includes(term) ||
        (question.answer?.selected_option_text || '').toLowerCase().includes(term) ||
        String(question.order || '').includes(term) ||
        String(question.answer?.score ?? '').includes(term)
      );
    }

    if (this.reviewTypeFilter !== 'all') {
      result = result.filter((question) => question.type === this.reviewTypeFilter);
    }

    if (this.reviewScoreFilter !== 'all') {
      result = result.filter((question) => {
        const hasScore = question.answer?.score !== null && question.answer?.score !== undefined;
        return this.reviewScoreFilter === 'graded' ? hasScore : !hasScore;
      });
    }

    result.sort((left, right) => {
      let comparison = 0;

      switch (this.reviewSortKey) {
        case 'order':
          comparison = (Number(left.order ?? 0) - Number(right.order ?? 0));
          break;
        case 'question_text':
          comparison = (left.question_text ?? '').localeCompare(right.question_text ?? '', 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'type':
          comparison = this.questionTypeLabel(left.type).localeCompare(this.questionTypeLabel(right.type), 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'answer':
          comparison = this.reviewAnswerLabel(left).localeCompare(this.reviewAnswerLabel(right), 'es', { numeric: true, sensitivity: 'base' });
          break;
        case 'score':
          comparison = this.reviewScoreValue(left) - this.reviewScoreValue(right);
          break;
      }

      return this.reviewSortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  clearReviewFilters(): void {
    this.reviewSearchTerm = '';
    this.reviewTypeFilter = 'all';
    this.reviewScoreFilter = 'all';
    this.reviewSortKey = 'order';
    this.reviewSortDir = 'asc';
    this.reviewPage = 1;
    this.scheduleTooltipRefresh();
  }

  sortReviewBy(key: 'order' | 'question_text' | 'type' | 'answer' | 'score'): void {
    if (this.reviewSortKey === key) {
      this.reviewSortDir = this.reviewSortDir === 'asc' ? 'desc' : 'asc';
      this.reviewPage = 1;
      this.scheduleTooltipRefresh();
      return;
    }

    this.reviewSortKey = key;
    this.reviewSortDir = 'asc';
    this.reviewPage = 1;
    this.scheduleTooltipRefresh();
  }

  getReviewSortIcon(key: 'order' | 'question_text' | 'type' | 'answer' | 'score'): string {
    if (this.reviewSortKey !== key) {
      return 'unfold_more';
    }

    return this.reviewSortDir === 'asc' ? 'north' : 'south';
  }

  get reviewTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReviewQuestions.length / this.reviewPageSize));
  }

  get paginatedReviewQuestions(): ParticipantReview['questions'] {
    const start = (this.reviewPage - 1) * this.reviewPageSize;
    return this.filteredReviewQuestions.slice(start, start + this.reviewPageSize);
  }

  get reviewStartRecord(): number {
    return this.filteredReviewQuestions.length === 0 ? 0 : (this.reviewPage - 1) * this.reviewPageSize + 1;
  }

  get reviewEndRecord(): number {
    return Math.min(this.reviewPage * this.reviewPageSize, this.filteredReviewQuestions.length);
  }

  get reviewPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.reviewPage - 2);
    const end = Math.min(this.reviewTotalPages, this.reviewPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onReviewPageChange(page: number): void {
    if (page >= 1 && page <= this.reviewTotalPages) {
      this.reviewPage = page;
      this.scheduleTooltipRefresh();
    }
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
    const passed: any = participant.passed;

    if (passed !== null && passed !== undefined) {
      return passed === true || passed === 1 || passed === '1';
    }

    const score = Number(participant.score ?? NaN);
    if (Number.isNaN(score)) {
      return false;
    }

    return score >= Number(this.training?.passing_score ?? 70);
  }

  presentedLabel(participant: TrainingParticipant): 'Sí' | 'No' | 'Pendiente' {
    const attended = participant.attended as any;

    if (attended === null || attended === undefined) {
      return 'Pendiente';
    }

    return attended === true || attended === 1 || attended === '1' ? 'Sí' : 'No';
  }

  private reviewAnswerLabel(question: ParticipantReview['questions'][number]): string {
    return question.answer?.answer_text
      ?? question.answer?.selected_option_text
      ?? '';
  }

  private participantScoreValue(participant: TrainingParticipant): number {
    const score = participant.score;
    return score === null || score === undefined ? -1 : Number(score);
  }

  private participantResultValue(participant: TrainingParticipant): string {
    if (participant.score === null || participant.score === undefined) {
      return 'Pendiente';
    }

    return this.participantPassed(participant) ? 'Aprobado' : 'No Aprobado';
  }

  private reviewScoreValue(question: ParticipantReview['questions'][number]): number {
    const score = question.answer?.score;
    return score === null || score === undefined ? -1 : Number(score);
  }

  closeModal(): void {
    if (this.activeModal) {
      this.activeModal.dismiss('close');
      return;
    }

    const programId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);

    if (programId > 0) {
      void this.router.navigate(['/trainings_programs', programId, 'trainings']);
      return;
    }

    void this.router.navigate(['/trainings_programs']);
  }

  private refreshTooltips(): void {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]'));
    const activeElements = new Set(elements);

    this.tooltipInstances.forEach((tooltip, element) => {
      if (!activeElements.has(element)) {
        tooltip.dispose();
        this.tooltipInstances.delete(element);
      }
    });

    elements.forEach((element) => {
      if (this.tooltipInstances.has(element)) {
        return;
      }

      this.tooltipInstances.set(element, new Tooltip(element));
    });
  }

  private scheduleTooltipRefresh(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
    }

    this.tooltipRefreshTimer = window.setTimeout(() => {
      this.tooltipRefreshTimer = null;
      this.refreshTooltips();
    });
  }
}
