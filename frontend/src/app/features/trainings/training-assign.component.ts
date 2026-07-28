import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Tooltip } from 'bootstrap';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { LoadingService } from '../../core/services/loading.service';
import { ParticipantReview, Training, TrainingParticipant, TrainingService } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-assign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent],
  template: `
    <app-page-header
      title="Participantes de capacitación"
      [subtitle]="'Administra los participantes de ' + trainingTitle + ' desde esta pantalla.'"
      [showDateFilter]="false"
    >
      <nav header-breadcrumbs aria-label="breadcrumb" class="page-header-breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <a [routerLink]="['/trainings_programs']" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">grid_view</span>
              Programas
            </a>
          </li>
          <li class="breadcrumb-item">
            <a [routerLink]="['/trainings_programs', trainingProgramId, 'trainings']" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">school</span>
              Capacitaciones
            </a>
          </li>
          <li class="breadcrumb-item active d-inline-flex align-items-center gap-1" aria-current="page">
            <span class="material-symbols-outlined text-[15px]">group</span>
            Participantes
          </li>
        </ol>
      </nav>
    </app-page-header>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <button class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold" type="button" (click)="openCreateModal()">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nuevo participante
          </button>
        </div>
        <div class="col-12 col-xl-auto">
          <div style="width: min(320px, 100%);">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-transparent border-white/10 text-on-surface-variant">
                <span class="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                class="form-control bg-transparent border-white/10 text-on-surface dashboard-table-search"
                type="search"
                placeholder="Buscar por cedula, nombre, email o telefono..."
                [(ngModel)]="searchTerm"
                name="searchTerm"
                (ngModelChange)="applyFilters()"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="material-symbols-outlined text-on-surface-variant">description</span>
            <span class="text-on-surface fw-semibold">Carga masiva y plantilla</span>
            <span class="text-on-surface-variant font-label-sm">
              Descarga la plantilla para registrar o actualizar participantes y vuelve a cargarla cuando termines.
            </span>
          </div>
        </div>
        <div class="col-12 col-xl-auto">
          <div class="d-flex gap-2 flex-wrap">
            <input #participantsFileInput type="file" class="d-none" accept=".xlsx,.xls" (change)="importReport($event)" />
            <button
              type="button"
              class="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
              (click)="downloadTemplate()"
              [disabled]="exporting"
            >
              <span class="material-symbols-outlined text-[16px]">download</span>
              {{ exporting ? 'Generando...' : 'Descargar plantilla' }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
              (click)="participantsFileInput.click()"
              [disabled]="importing"
            >
              <span class="material-symbols-outlined text-[16px]">upload_file</span>
              {{ importing ? 'Cargando...' : 'Cargar Excel' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <app-swal-alert *ngIf="message" [message]="message" type="success" (closed)="message = ''"></app-swal-alert>
    <app-swal-alert *ngIf="errorMessage" [message]="errorMessage" type="danger" (closed)="errorMessage = ''"></app-swal-alert>

    <div *ngIf="loadingParticipants" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">Cargando participantes...</div>
    </div>

    <div *ngIf="!loadingParticipants && participants.length === 0" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md mb-3">No hay participantes registrados.</div>
      <button class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold" type="button" (click)="openCreateModal()">
        <span class="material-symbols-outlined text-[18px]">add</span>
        Nuevo participante
      </button>
    </div>

    <div *ngIf="!loadingParticipants && participants.length > 0 && filteredParticipants.length > 0" class="card glass-card dashboard-table-card border-0 rounded-4 overflow-hidden mb-4">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 dashboard-table">
          <thead class="participant-table-head">
            <tr class="border-bottom border-white/10">
              <th class="ps-4 py-3 font-label-sm text-on-surface-variant text-uppercase participant-table-th">#</th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('document_number')">
                  Cedula <span class="material-symbols-outlined sort-icon">{{ getSortIcon('document_number') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('full_name')">
                  Nombre <span class="material-symbols-outlined sort-icon">{{ getSortIcon('full_name') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('email')">
                  Email <span class="material-symbols-outlined sort-icon">{{ getSortIcon('email') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('phone')">
                  Telefono <span class="material-symbols-outlined sort-icon">{{ getSortIcon('phone') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('score')">
                  Puntaje / Resultado <span class="material-symbols-outlined sort-icon">{{ getSortIcon('score') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase participant-table-th">Estado</th>
              <th class="pe-4 py-3 font-label-sm text-on-surface-variant text-uppercase text-end participant-table-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let participant of paginatedParticipants" class="border-bottom border-white/5">
              <td class="ps-4 py-3 font-mono text-on-surface">{{ participant.id }}</td>
              <td class="py-3 font-semibold text-on-surface">{{ participant.document_number }}</td>
              <td class="py-3 text-on-surface">{{ participant.full_name }}</td>
              <td class="py-3">
                <span
                  class="participant-email-chip d-inline-flex align-items-center justify-content-center"
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  [attr.title]="participant.email || 'Sin correo'"
                  [attr.aria-label]="participant.email || 'Sin correo'"
                >
                  <span class="material-symbols-outlined participant-email-icon">
                    mail
                  </span>
                </span>
              </td>
              <td class="py-3">
                <span
                  class="participant-email-chip d-inline-flex align-items-center justify-content-center"
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  [attr.title]="participant.phone || 'Sin telefono'"
                  [attr.aria-label]="participant.phone || 'Sin telefono'"
                >
                  <span class="material-symbols-outlined participant-email-icon">
                    call
                  </span>
                </span>
              </td>
              <td class="py-3">
                <div class="d-flex flex-column gap-2">
                  <span
                    *ngIf="participant.score !== null && participant.score !== undefined"
                    class="badge rounded-pill px-3 py-2 participant-result-badge"
                    [ngClass]="participantPassed(participant) ? 'participant-result-approved' : 'participant-result-rejected'"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    [attr.title]="attemptsTooltip(participant)"
                    [attr.aria-label]="attemptsTooltip(participant)"
                  >
                    {{ participantPassed(participant) ? 'Aprobado' : 'No Aprobado' }}<br>{{ participant.score }}%
                  </span>
                  <span
                    *ngIf="participant.score === null || participant.score === undefined"
                    class="badge rounded-pill px-3 py-2 participant-result-badge participant-result-pending"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    [attr.title]="attemptsTooltip(participant)"
                    [attr.aria-label]="attemptsTooltip(participant)"
                  >
                    Pendiente de revision
                  </span>
                </div>
              </td>
              <td class="py-3">
                <span class="badge rounded-pill px-3 py-2 participant-state-badge" [ngClass]="participant.active ? 'participant-state-active' : 'participant-state-inactive'">
                  {{ participant.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="pe-4 py-3 text-end">
                <div class="dashboard-action-group">
                  <button
                    *ngIf="participant.active"
                    type="button"
                    class="btn btn-sm btn-outline-danger fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="deactivateParticipant(participant)"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Desactivar participante"
                    aria-label="Desactivar participante"
                  >
                    <span class="material-symbols-outlined text-[16px]">toggle_off</span>
                  </button>
                  <button
                    *ngIf="!participant.active"
                    type="button"
                    class="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="activateParticipant(participant)"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Activar participante"
                    aria-label="Activar participante"
                  >
                    <span class="material-symbols-outlined text-[16px]">toggle_on</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="editParticipant(participant)"
                  >
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="removeParticipant(participant)"
                  >
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                  <button
                    *ngIf="participant.completed_at"
                    type="button"
                    class="btn btn-sm btn-outline-info fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="openReview(participant)"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Revisar resultado"
                    aria-label="Revisar resultado"
                  >
                    <span class="material-symbols-outlined text-[16px]">rate_review</span>
                  </button>
                  <button
                    *ngIf="participant.active"
                    type="button"
                    class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1"
                    (click)="resetAttempt(participant)"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Volver a presentar la capacitacion"
                    aria-label="Volver a presentar la capacitacion"
                  >
                    <span class="material-symbols-outlined text-[16px]">replay</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-3 px-md-4 py-3 border-top border-white/10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        <p class="text-on-surface-variant font-label-sm mb-0">
          Mostrando {{ startRecord }}-{{ endRecord }} de {{ filteredParticipants.length }} participantes
        </p>
        <nav aria-label="Paginacion de participantes">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="page === 1">
              <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(1)" aria-label="Primera" data-bs-toggle="tooltip" data-bs-placement="top" title="Primera pagina">
                <span class="material-symbols-outlined text-[16px]">first_page</span>
              </button>
            </li>
            <li class="page-item" [class.disabled]="page === 1">
              <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(page - 1)" aria-label="Anterior" data-bs-toggle="tooltip" data-bs-placement="top" title="Pagina anterior">
                <span class="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
            </li>
            <li class="page-item" *ngFor="let p of pageNumbers">
              <button class="page-link bg-transparent border-white/10 text-on-surface" [class.active]="page === p" (click)="onPageChange(p)">{{ p }}</button>
            </li>
            <li class="page-item" [class.disabled]="page === totalPages">
              <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(page + 1)" aria-label="Siguiente" data-bs-toggle="tooltip" data-bs-placement="top" title="Pagina siguiente">
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </li>
            <li class="page-item" [class.disabled]="page === totalPages">
              <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(totalPages)" aria-label="Ultima" data-bs-toggle="tooltip" data-bs-placement="top" title="Ultima pagina">
                <span class="material-symbols-outlined text-[16px]">last_page</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div *ngIf="!loadingParticipants && participants.length > 0 && filteredParticipants.length === 0" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">No se encontraron participantes.</div>
    </div>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="material-symbols-outlined text-on-surface-variant">summarize</span>
            <span class="text-on-surface fw-semibold">Reporte completo</span>
            <span class="text-on-surface-variant font-label-sm">
              Descarga un Excel con asistencia, puntaje, resultado y observaciones de cada participante.
            </span>
          </div>
        </div>
        <div class="col-12 col-xl-auto">
          <button
            type="button"
            class="btn btn-sm btn-outline-info fw-semibold d-inline-flex align-items-center gap-1"
            (click)="downloadFullReport()"
            [disabled]="reportExporting"
          >
            <span class="material-symbols-outlined text-[16px]">table_view</span>
            {{ reportExporting ? 'Generando...' : 'Descargar reporte' }}
          </button>
        </div>
      </div>
    </div>

    <app-modal-shell
      *ngIf="reviewingParticipant"
      kicker="Participantes de capacitación"
      title="Revisión de resultado"
      [subtitle]="reviewingParticipant.full_name + ' | ' + reviewingParticipant.document_number"
      headerVariant="info"
      footerVariant="info"
      size="xl"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="hasOpenQuestions()"
      [showSecondaryButton]="true"
      primaryLabel="Guardar calificacion"
      secondaryLabel="Cerrar"
      [primaryDisabled]="reviewSaving || !hasPendingOpenQuestions()"
      [primaryLoading]="reviewSaving"
      (secondaryRequested)="closeReview()"
      (primaryRequested)="saveReview()"
      (closeRequested)="closeReview()"
    >
      <div modal-body>
        <div *ngIf="reviewLoading" class="text-center py-4">
          <div class="text-on-surface-variant font-body-md">Cargando revision...</div>
        </div>

        <div *ngIf="reviewError" class="alert alert-danger">{{ reviewError }}</div>

        <div *ngIf="reviewData && !reviewLoading">
          <div class="alert alert-info py-2 font-label-sm">
            <span class="material-symbols-outlined text-[16px] align-middle me-1">info</span>
            Aqui puedes comparar cada pregunta con la respuesta esperada y la respuesta registrada por el participante.
            Las preguntas abiertas siguen pudiendose calificar manualmente.
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
                  {{ filteredReviewQuestions.length }} de {{ reviewData.questions.length }}
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
                        Debio contestar <span class="material-symbols-outlined sort-icon">{{ getReviewSortIcon('answer') }}</span>
                      </button>
                    </th>
                    <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th">
                      <button type="button" class="sort-trigger review-sort-trigger" (click)="sortReviewBy('score')">
                        Contesto <span class="material-symbols-outlined sort-icon">{{ getReviewSortIcon('score') }}</span>
                      </button>
                    </th>
                    <th class="py-3 font-label-sm text-on-surface-variant text-uppercase">
                      Puntaje
                    </th>
                    <th class="pe-3 py-3 font-label-sm text-on-surface-variant text-uppercase text-end">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let q of filteredReviewQuestions; let i = index" class="border-bottom border-white/5">
                    <td class="ps-3 py-3 font-mono text-on-surface">{{ q.order }}</td>
                    <td class="py-3">
                      <div class="fw-semibold text-on-surface">{{ q.question_text }}</div>
                    </td>
                    <td class="py-3">
                      <span class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 text-uppercase">
                        {{ questionTypeLabel(q.type) }}
                      </span>
                    </td>
                    <td class="py-3">
                      <div class="d-flex flex-column gap-1">
                        <span class="text-on-surface-variant d-block font-label-sm">Respuesta esperada</span>
                        <div class="text-on-surface">{{ reviewExpectedAnswerLabel(q) }}</div>
                      </div>
                    </td>
                    <td class="py-3">
                      <div class="d-flex flex-column gap-1">
                        <span class="text-on-surface-variant d-block font-label-sm">Respuesta del participante</span>
                        <div class="text-on-surface">{{ reviewParticipantAnswerLabel(q) }}</div>
                      </div>
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
                        <span *ngIf="q.answer?.score !== null && q.answer?.score !== undefined" class="ms-2 badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1">
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
                      <span *ngIf="q.type !== 'open' && q.answer?.is_correct === true" class="badge rounded-pill bg-chart-green/10 text-chart-green border border-chart-green/20 px-3 py-2">
                        Correcta
                      </span>
                      <span *ngIf="q.type !== 'open' && q.answer?.is_correct === false" class="badge rounded-pill bg-chart-red/10 text-chart-red border border-chart-red/20 px-3 py-2">
                        Incorrecta
                      </span>
                      <span *ngIf="q.type !== 'open' && (q.answer?.is_correct === null || q.answer?.is_correct === undefined) && q.answer" class="badge rounded-pill bg-primary/10 text-primary border border-primary/20 px-3 py-2">
                        Revisar
                      </span>
                      <span *ngIf="q.type !== 'open' && !q.answer" class="badge rounded-pill bg-secondary/10 text-secondary border border-secondary/20 px-3 py-2">
                        Sin respuesta
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div *ngIf="hasOpenQuestions() && !hasPendingOpenQuestions()" class="text-on-surface-variant mt-2 font-label-sm">
            Todas las preguntas abiertas ya tienen puntaje guardado.
          </div>
          <div *ngIf="!hasOpenQuestions()" class="text-on-surface-variant font-label-sm">
            Esta prueba no tiene preguntas abiertas pendientes de revision.
          </div>
        </div>
      </div>
    </app-modal-shell>

    <app-modal-shell
      *ngIf="creating"
      kicker="Participantes de capacitación"
      title="Nuevo participante"
      subtitle="Registra un participante para esta capacitación."
      headerVariant="info"
      footerVariant="info"
      size="md"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      primaryLabel="Agregar participante"
      secondaryLabel="Cancelar"
      [primaryDisabled]="savingCreate"
      [primaryLoading]="savingCreate"
      (secondaryRequested)="closeCreateModal()"
      (primaryRequested)="saveCreateModal()"
      (closeRequested)="closeCreateModal()"
    >
      <div modal-body>
        <form #createForm="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Cedula *</label>
            <input
              #createDocumentNumberModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="createDocumentNumber"
              name="createDocumentNumber"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(createDocumentNumberModel.touched || createForm.submitted) && createDocumentNumberModel.invalid">
              La cedula es obligatoria.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Nombre *</label>
            <input
              #createFullNameModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="createFullName"
              name="createFullName"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(createFullNameModel.touched || createForm.submitted) && createFullNameModel.invalid">
              El nombre es obligatorio.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Email</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="createEmail" name="createEmail" />
          </div>
          <div class="mb-0">
            <label class="form-label small text-on-surface-variant">Telefono</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="createPhone" name="createPhone" />
          </div>
        </form>
      </div>
    </app-modal-shell>

    <app-modal-shell
      *ngIf="editingParticipant"
      kicker="Participantes de capacitación"
      title="Editar participante"
      [subtitle]="'Actualiza los datos de ' + editingParticipant.full_name + '.'"
      headerVariant="warning"
      footerVariant="warning"
      size="md"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      primaryLabel="Guardar cambios"
      secondaryLabel="Cancelar"
      [primaryDisabled]="savingEdit"
      [primaryLoading]="savingEdit"
      (secondaryRequested)="closeEditModal()"
      (primaryRequested)="saveEditModal()"
      (closeRequested)="closeEditModal()"
    >
      <div modal-body>
        <form #editForm="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Cedula *</label>
            <input
              #editDocumentNumberModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="editDocumentNumber"
              name="editDocumentNumber"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(editDocumentNumberModel.touched || editForm.submitted) && editDocumentNumberModel.invalid">
              La cedula es obligatoria.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Nombre *</label>
            <input
              #editFullNameModel="ngModel"
              class="form-control bg-transparent border-white/10 text-on-surface"
              [(ngModel)]="editFullName"
              name="editFullName"
              required
            />
            <div class="invalid-feedback d-block" *ngIf="(editFullNameModel.touched || editForm.submitted) && editFullNameModel.invalid">
              El nombre es obligatorio.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Email</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editEmail" name="editEmail" />
          </div>
          <div class="mb-0">
            <label class="form-label small text-on-surface-variant">Telefono</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editPhone" name="editPhone" />
          </div>
        </form>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host .participant-table-head th {
      font-size: 0.72rem;
      line-height: 1.1;
      letter-spacing: 0.08em;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host .participant-table-head .sortable-th {
      padding-top: 0.85rem;
      padding-bottom: 0.85rem;
    }

    :host .participant-sort-trigger {
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

    :host .participant-sort-trigger .sort-icon {
      font-size: 18px !important;
      flex: 0 0 auto;
    }

    :host-context(.light) .participant-table-head th {
      color: #334155;
    }

    :host-context(.light) .participant-sort-trigger {
      color: #1e293b;
    }

    :host-context(.light) .participant-sort-trigger:hover,
    :host-context(.light) .participant-sort-trigger:focus-visible {
      color: #0457bf;
    }

    :host .review-table-head th {
      font-size: 0.72rem;
      line-height: 1.1;
      letter-spacing: 0.08em;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host .review-table-wrap {
      overflow-x: auto;
    }

    :host .review-table {
      min-width: 1180px;
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

    :host .participant-result-badge {
      min-width: 8.5rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-align: center;
      border-width: 1px;
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

    :host .participant-email-chip {
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(255, 255, 255, 0.04);
      color: #60a5fa;
      transition:
        transform 160ms ease,
        background 160ms ease,
        border-color 160ms ease,
        color 160ms ease;
    }

    :host .participant-email-chip:hover,
    :host .participant-email-chip:focus-visible {
      transform: translateY(-1px);
      background: rgba(96, 165, 250, 0.1);
      border-color: rgba(96, 165, 250, 0.28);
      color: #93c5fd;
    }

    :host .participant-email-icon {
      font-size: 18px;
      line-height: 1;
    }

    :host .participant-state-badge {
      min-width: 6.75rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-align: center;
      border-width: 1px;
    }

    :host .participant-state-active {
      background: rgba(34, 197, 94, 0.18);
      border-color: rgba(34, 197, 94, 0.42);
      color: #86efac;
    }

    :host .participant-state-inactive {
      background: rgba(148, 163, 184, 0.18);
      border-color: rgba(148, 163, 184, 0.38);
      color: #cbd5e1;
    }

    @media (max-width: 767.98px) {
      :host .review-table {
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

    :host-context(.light) .participant-email-chip {
      background: rgba(15, 23, 42, 0.03);
      border-color: rgba(100, 116, 139, 0.24);
      color: #2563eb;
    }

    :host-context(.light) .participant-email-chip:hover,
    :host-context(.light) .participant-email-chip:focus-visible {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.28);
      color: #1d4ed8;
    }

    :host-context(.light) .participant-state-active {
      background: rgba(34, 197, 94, 0.12);
      border-color: rgba(34, 197, 94, 0.28);
      color: #166534;
    }

    :host-context(.light) .participant-state-inactive {
      background: rgba(148, 163, 184, 0.12);
      border-color: rgba(148, 163, 184, 0.28);
      color: #475569;
    }
  `]
})
export class TrainingAssignComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @Input() trainingIdInput?: number;
  @Input() trainingTitleInput?: string;
  @Output() saved = new EventEmitter<void>();

  trainingId = 0;
  trainingProgramId = 0;
  trainingTitle = '';
  training?: Training;
  participants: TrainingParticipant[] = [];
  filteredParticipants: TrainingParticipant[] = [];
  searchTerm = '';
  sortKey = 'id';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 10;
  message = '';
  errorMessage = '';
  exporting = false;
  reportExporting = false;
  importing = false;
  loadingParticipants = false;
  creating = false;
  savingCreate = false;
  savingEdit = false;
  reviewingParticipant: TrainingParticipant | null = null;
  reviewData: ParticipantReview | null = null;
  reviewLoading = false;
  reviewSaving = false;
  reviewError = '';
  reviewObservations = '';
  reviewScores: Record<number, string> = {};
  reviewSearchTerm = '';
  reviewTypeFilter: 'all' | 'open' | 'multiple_choice' | 'yes_no' = 'all';
  reviewScoreFilter: 'all' | 'pending' | 'graded' = 'all';
  reviewSortKey: 'order' | 'question_text' | 'type' | 'answer' | 'score' = 'order';
  reviewSortDir: 'asc' | 'desc' = 'asc';
  createDocumentNumber = '';
  createFullName = '';
  createEmail = '';
  createPhone = '';
  editDocumentNumber = '';
  editFullName = '';
  editEmail = '';
  editPhone = '';
  editingParticipant: TrainingParticipant | null = null;
  private tooltipInstances = new Map<HTMLElement, Tooltip>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

  @ViewChild('createForm') private createForm?: NgForm;
  @ViewChild('editForm') private editForm?: NgForm;

  ngOnInit(): void {
    this.trainingId = this.trainingIdInput ?? +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.trainingProgramId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);
    this.trainingTitle = this.trainingTitleInput ?? '';

    this.loadTraining();
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredParticipants.length / this.pageSize));
  }

  get paginatedParticipants(): TrainingParticipant[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredParticipants.slice(start, start + this.pageSize);
  }

  get startRecord(): number {
    return this.filteredParticipants.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredParticipants.length);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  loadTraining(): void {
    this.trainingService.get(this.trainingId).subscribe({
      next: (training) => {
        this.training = training;
        this.trainingTitle = this.trainingTitle || training.title;
        this.scheduleTooltipRefresh();
      }
    });

    this.reloadParticipants();
  }

  reloadParticipants(): void {
    this.loadingParticipants = true;
    this.loadingService.track(this.trainingService.getTrainingParticipants(this.trainingId))
      .pipe(finalize(() => (this.loadingParticipants = false)))
      .subscribe({
        next: (participants) => {
          this.participants = participants;
          this.applyFilters();
          this.scheduleTooltipRefresh();
        },
        error: () => {
          this.participants = [];
          this.filteredParticipants = [];
          this.errorMessage = 'No fue posible cargar los participantes.';
        }
      });
  }

  applyFilters(): void {
    let result = [...this.participants];
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((participant) => {
        const presented = this.presentedLabel(participant).toLowerCase();
        const score = participant.score !== null && participant.score !== undefined ? `${participant.score}` : '';
        const resultLabel = this.participantPassed(participant) ? 'aprobado' : 'no aprobado';
        const activeLabel = participant.active ? 'activo' : 'inactivo';
        return (
          participant.document_number.toLowerCase().includes(term) ||
          participant.full_name.toLowerCase().includes(term) ||
          (participant.email || '').toLowerCase().includes(term) ||
          (participant.phone || '').toLowerCase().includes(term) ||
          presented.includes(term) ||
          score.toLowerCase().includes(term) ||
          resultLabel.includes(term) ||
          activeLabel.includes(term)
        );
      });
    }

    result.sort((a, b) => {
      const left = this.getSortValue(a, this.sortKey);
      const right = this.getSortValue(b, this.sortKey);
      const comparison = left.localeCompare(right, 'es', { numeric: true, sensitivity: 'base' });
      return this.sortDir === 'asc' ? comparison : -comparison;
    });

    this.filteredParticipants = result;
    this.page = 1;
  }

  private refreshTooltips(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();

    document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]').forEach((element) => {
      const tooltip = new Tooltip(element, {
        trigger: 'hover focus',
        placement: element.getAttribute('data-bs-placement') || 'top',
        container: 'body'
      });

      this.tooltipInstances.set(element, tooltip);
    });
  }

  private scheduleTooltipRefresh(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
    }

    this.tooltipRefreshTimer = window.setTimeout(() => {
      this.refreshTooltips();
      this.tooltipRefreshTimer = null;
    });
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }

    this.applyFilters();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
      this.scheduleTooltipRefresh();
    }
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) {
      return 'unfold_more';
    }

    return this.sortDir === 'asc' ? 'north' : 'south';
  }

  getSortValue(participant: TrainingParticipant, key: string): string {
    switch (key) {
      case 'document_number':
        return participant.document_number || '';
      case 'full_name':
        return participant.full_name || '';
      case 'email':
        return participant.email || '';
      case 'phone':
        return participant.phone || '';
      case 'presented':
        return this.presentedLabel(participant);
      case 'score':
        return this.participantScoreValue(participant).toString();
      case 'result':
        return this.participantResultValue(participant);
      case 'completed_at':
        return participant.completed_at ? '1' : '0';
      case 'id':
      default:
        return String(participant.id ?? 0);
    }
  }

  presentedLabel(participant: TrainingParticipant): string {
    if (!participant.completed_at) {
      return 'Pendiente';
    }

    return participant.attended ? 'Si' : 'No';
  }

  participantScoreValue(participant: TrainingParticipant): number {
    return Number(participant.score ?? -1);
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

  participantResultValue(participant: TrainingParticipant): string {
    if (participant.score === null || participant.score === undefined) {
      return 'z-pendiente';
    }

    return this.participantPassed(participant) ? 'a-aprobado' : 'b-reprobado';
  }

  attemptsTooltip(participant: TrainingParticipant): string {
    const attempts = Math.max(Number(participant.attempts_count ?? 0), 0);
    return `Intentos: ${attempts}`;
  }

  activateParticipant(participant: TrainingParticipant): void {
    if (!this.training) {
      return;
    }

    this.loadingService.track(this.trainingService.activateTrainingParticipant(this.training.id, participant.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.saved.emit();
        this.reloadParticipants();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo activar el participante.';
      }
    });
  }

  deactivateParticipant(participant: TrainingParticipant): void {
    if (!this.training) {
      return;
    }

    this.loadingService.track(this.trainingService.deactivateTrainingParticipant(this.training.id, participant.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.saved.emit();
        this.reloadParticipants();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo desactivar el participante.';
      }
    });
  }

  clearReviewFilters(): void {
    this.reviewSearchTerm = '';
    this.reviewTypeFilter = 'all';
    this.reviewScoreFilter = 'all';
    this.reviewSortKey = 'order';
    this.reviewSortDir = 'asc';
  }

  applyReviewFilters(): void {
    // The review table is derived from the current filter state.
  }

  openReview(participant: TrainingParticipant): void {
    if (!this.training) {
      return;
    }

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

  resetAttempt(participant: TrainingParticipant): void {
    if (!this.training) {
      return;
    }

    const name = participant.full_name || (participant as any).name || 'este participante';
    const confirmed = window.confirm(
      `Volver a presentar la capacitacion de ${name}? Esto borrara sus respuestas y le permitira presentar de nuevo.`
    );

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.trainingService.resetParticipantAttempt(this.training.id, participant.id)).subscribe({
      next: () => {
        this.message = 'Capacitacion habilitada para volver a presentar.';
        this.closeReview();
        this.reloadParticipants();
      }
    });
  }

  hasOpenQuestions(): boolean {
    return (this.reviewData?.questions ?? []).some((question) => question.type === 'open');
  }

  hasPendingOpenQuestions(): boolean {
    return (this.reviewData?.questions ?? []).some((question) => {
      if (question.type !== 'open') {
        return false;
      }

      const score = this.reviewScores[question.id];
      return score === '' || score === null || score === undefined;
    });
  }

  saveReview(): void {
    if (!this.training || !this.reviewingParticipant || !this.reviewData) {
      return;
    }

    const openQuestions = this.reviewData.questions.filter((question) => question.type === 'open');

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
          this.reloadParticipants();
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
        (question.expected_answer_text || '').toLowerCase().includes(term) ||
        (question.participant_answer_text || '').toLowerCase().includes(term) ||
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

  sortReviewBy(key: 'order' | 'question_text' | 'type' | 'answer' | 'score'): void {
    if (this.reviewSortKey === key) {
      this.reviewSortDir = this.reviewSortDir === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.reviewSortKey = key;
    this.reviewSortDir = 'asc';
  }

  getReviewSortIcon(key: 'order' | 'question_text' | 'type' | 'answer' | 'score'): string {
    if (this.reviewSortKey !== key) {
      return 'unfold_more';
    }

    return this.reviewSortDir === 'asc' ? 'north' : 'south';
  }

  questionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      multiple_choice: 'Multiple',
      yes_no: 'Si / No'
    };

    return labels[type] || type;
  }

  reviewAnswerLabel(question: ParticipantReview['questions'][number]): string {
    if (question.answer?.answer_text) {
      return question.answer.answer_text;
    }

    if (question.answer?.selected_option_text) {
      return question.answer.selected_option_text;
    }

    return '';
  }

  reviewExpectedAnswerLabel(question: ParticipantReview['questions'][number]): string {
    if (question.expected_answer_text && question.expected_answer_text.trim() !== '') {
      return question.expected_answer_text;
    }

    if (question.type === 'open') {
      return 'Revision manual';
    }

    const correctOptions = (question.options ?? [])
      .filter((option) => option.is_correct)
      .map((option) => option.option_text)
      .filter((optionText) => optionText && optionText.trim() !== '');

    if (correctOptions.length > 0) {
      return correctOptions.join(', ');
    }

    return 'Sin respuesta correcta configurada';
  }

  reviewParticipantAnswerLabel(question: ParticipantReview['questions'][number]): string {
    if (question.participant_answer_text && question.participant_answer_text.trim() !== '') {
      return question.participant_answer_text;
    }

    const fallback = this.reviewAnswerLabel(question);
    return fallback !== '' ? fallback : 'Sin respuesta registrada';
  }

  reviewScoreValue(question: ParticipantReview['questions'][number]): number {
    return Number(question.answer?.score ?? -1);
  }

  openCreateModal(): void {
    this.creating = true;
    this.errorMessage = '';
    this.createDocumentNumber = '';
    this.createFullName = '';
    this.createEmail = '';
    this.createPhone = '';
    this.savingCreate = false;
  }

  closeCreateModal(): void {
    this.creating = false;
  }

  saveCreateModal(): void {
    const formInstance = this.createForm;
    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.trainingId || !this.createDocumentNumber.trim() || !this.createFullName.trim()) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      document_number: this.createDocumentNumber.trim(),
      full_name: this.createFullName.trim(),
      email: this.createEmail.trim() || undefined,
      phone: this.createPhone.trim() || undefined,
    };

    this.savingCreate = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.createTrainingParticipant(this.trainingId, payload))
      .pipe(finalize(() => (this.savingCreate = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.saved.emit();
          this.closeCreateModal();
          this.reloadParticipants();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'No se pudo guardar el participante.';
        }
      });
  }

  editParticipant(participant: TrainingParticipant): void {
    this.editingParticipant = participant;
    this.editDocumentNumber = participant.document_number;
    this.editFullName = participant.full_name;
    this.editEmail = participant.email || '';
    this.editPhone = participant.phone || '';
    this.errorMessage = '';
    this.savingEdit = false;
  }

  closeEditModal(): void {
    this.editingParticipant = null;
  }

  saveEditModal(): void {
    const participant = this.editingParticipant;
    const formInstance = this.editForm;

    if (!participant) {
      return;
    }

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.trainingId || !this.editDocumentNumber.trim() || !this.editFullName.trim()) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      document_number: this.editDocumentNumber.trim(),
      full_name: this.editFullName.trim(),
      email: this.editEmail.trim() || undefined,
      phone: this.editPhone.trim() || undefined,
    };

    this.savingEdit = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.updateTrainingParticipant(this.trainingId, participant.id, payload))
      .pipe(finalize(() => (this.savingEdit = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.saved.emit();
          this.closeEditModal();
          this.reloadParticipants();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'No se pudo guardar el participante.';
        }
      });
  }

  removeParticipant(participant: TrainingParticipant): void {
    const confirmed = window.confirm(`Eliminar a ${participant.full_name}?`);
    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteTrainingParticipant(this.trainingId, participant.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.saved.emit();
        this.reloadParticipants();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No se pudo eliminar el participante.';
      }
    });
  }

  downloadTemplate(): void {
    if (this.exporting || !this.trainingId) {
      return;
    }

    this.errorMessage = '';
    this.exporting = true;

    this.loadingService.track(this.trainingService.downloadTrainingParticipantsTemplate(this.trainingId))
      .pipe(finalize(() => (this.exporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `plantilla-participantes-${this.trainingId}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.message = 'Plantilla Excel descargada correctamente.';
        },
        error: () => (this.errorMessage = 'Error al descargar la plantilla Excel.')
      });
  }

  downloadFullReport(): void {
    if (this.reportExporting || !this.trainingId) {
      return;
    }

    this.errorMessage = '';
    this.reportExporting = true;

    this.loadingService.track(this.trainingService.downloadTrainingParticipantsReport(this.trainingId))
      .pipe(finalize(() => (this.reportExporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reporte-participantes-${this.trainingId}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.message = 'Reporte Excel descargado correctamente.';
        },
        error: () => (this.errorMessage = 'Error al descargar el reporte Excel.')
      });
  }

  importReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.importing || !this.trainingId) {
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.importing = true;

    this.loadingService.track(this.trainingService.importTrainingParticipantsReport(this.trainingId, file))
      .pipe(finalize(() => {
        this.importing = false;
        input.value = '';
      }))
      .subscribe({
        next: (result) => {
          this.message = `Carga procesada: ${result.created} creados, ${result.updated} actualizados y ${result.skipped} omitidos.`;
          if (result.errors.length > 0) {
            this.errorMessage = `Se omitieron ${result.skipped} filas por errores de validacion.`;
          }
          this.reloadParticipants();
        },
        error: () => {
          this.errorMessage = 'Error al cargar el Excel de participantes.';
        }
      });
  }

  closeModal(): void {
    const programId = Number(this.route.parent?.snapshot.paramMap.get('programId') ?? this.route.snapshot.paramMap.get('programId') ?? 0);

    if (programId > 0) {
      void this.router.navigate(['/trainings_programs', programId, 'trainings']);
      return;
    }

    void this.router.navigate(['/trainings_programs']);
  }
}
