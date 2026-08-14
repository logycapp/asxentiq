import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Training, PublicUser, TrainingCategory } from '../../core/services/training.service';
import { PrivacyConsentModalComponent } from '../../core/components/privacy-consent-modal.component';

@Component({
  selector: 'app-public-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PrivacyConsentModalComponent],
  template: `
    <div class="public-dashboard-shell">
      <div class="public-dashboard-backdrop"></div>
      <div class="public-dashboard-orb public-dashboard-orb-a"></div>
      <div class="public-dashboard-orb public-dashboard-orb-b"></div>

      <div class="container public-dashboard-container py-4 py-xl-5">
        <div class="public-dashboard-hero mb-4">
          <div class="d-flex flex-column flex-xl-row justify-content-between align-items-xl-start gap-4">
            <div class="public-dashboard-hero-copy">
              <div class="public-dashboard-kicker">Portal del participante</div>
              <h1 class="public-dashboard-title mb-2">Bienvenido, {{ user?.name }}</h1>
              <p class="public-dashboard-subtitle mb-0">
                Revisa tus capacitaciones pendientes, completa las que tienes activas y consulta tus resultados desde un solo lugar.
              </p>
            </div>

            <div class="d-flex flex-column align-items-start align-items-xl-end gap-3">
              <button class="btn public-dashboard-logout-btn" (click)="logout()">
                <span class="material-symbols-outlined text-[18px]">logout</span>
                Cerrar sesion
              </button>
              <div class="public-dashboard-identity">
                <span class="material-symbols-outlined">badge</span>
                <div>
                  <div class="public-dashboard-identity-label">Cedula</div>
                  <div class="public-dashboard-identity-value">{{ user?.document_number }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-12 col-md-4">
            <div class="public-dashboard-stat">
              <div class="public-dashboard-stat-icon public-dashboard-stat-icon-pending">
                <span class="material-symbols-outlined">pending_actions</span>
              </div>
              <div>
                <div class="public-dashboard-stat-label">Pendientes</div>
                <div class="public-dashboard-stat-value">{{ pending.length }}</div>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="public-dashboard-stat">
              <div class="public-dashboard-stat-icon public-dashboard-stat-icon-completed">
                <span class="material-symbols-outlined">verified</span>
              </div>
              <div>
                <div class="public-dashboard-stat-label">Completadas</div>
                <div class="public-dashboard-stat-value">{{ completed.length }}</div>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="public-dashboard-stat">
              <div class="public-dashboard-stat-icon public-dashboard-stat-icon-total">
                <span class="material-symbols-outlined">school</span>
              </div>
              <div>
                <div class="public-dashboard-stat-label">Total asignadas</div>
                <div class="public-dashboard-stat-value">{{ totalAssigned }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="public-dashboard-tabs mb-4">
          <button class="public-dashboard-tab" [class.is-active]="tab === 'pending'" (click)="tab = 'pending'">
            <span class="material-symbols-outlined">schedule</span>
            <span>Pendientes</span>
            <span *ngIf="pending.length > 0" class="public-dashboard-tab-badge">{{ pending.length }}</span>
          </button>
          <button class="public-dashboard-tab" [class.is-active]="tab === 'completed'" (click)="tab = 'completed'">
            <span class="material-symbols-outlined">task_alt</span>
            <span>Completadas</span>
            <span *ngIf="completed.length > 0" class="public-dashboard-tab-badge">{{ completed.length }}</span>
          </button>
        </div>

        <div *ngIf="tab === 'pending'" class="public-dashboard-section">
          <div *ngIf="pending.length === 0" class="public-dashboard-empty">
            <span class="material-symbols-outlined">check_circle</span>
            <h3>No tienes capacitaciones pendientes</h3>
            <p>Cuando te asignen nuevas capacitaciones aparecerán aqui para que puedas realizarlas.</p>
          </div>

          <div *ngFor="let group of pendingGroups" class="public-dashboard-group">
            <div class="public-dashboard-group-header">
              <div class="public-dashboard-program-heading">
                <div class="public-dashboard-program-logo" [class.has-logo]="group.category?.empresa?.logo_url">
                  <img
                    *ngIf="group.category?.empresa?.logo_url as logoUrl"
                    [src]="logoUrl"
                    [alt]="'Logo de ' + (group.category?.empresa?.name || 'la empresa')"
                  />
                  <span *ngIf="!group.category?.empresa?.logo_url" class="material-symbols-outlined">business</span>
                </div>
                <div>
                  <div class="public-dashboard-group-kicker">Programa</div>
                  <h2 class="public-dashboard-group-title mb-0">{{ categoryLabel(group.category) }}</h2>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="public-dashboard-group-badge">{{ group.trainings.length }}</span>
                <button class="btn public-dashboard-group-toggle" type="button" (click)="togglePendingGroup(group.category)">
                  {{ isPendingGroupExpanded(group.category) ? 'Ocultar capacitaciones' : 'Abrir capacitaciones' }}
                </button>
              </div>
            </div>

            <div *ngIf="isPendingGroupExpanded(group.category)" class="public-dashboard-group-body">
              <div *ngFor="let t of group.trainings" class="public-training-item">
                <div class="public-training-item-main">
                  <div class="public-training-item-icon">
                    <span class="material-symbols-outlined">play_circle</span>
                  </div>
                  <div>
                    <h3 class="public-training-item-title mb-1">{{ t.title }}</h3>
                    <div class="public-training-item-meta">
                      <span>{{ t.questions_count }} preguntas</span>
                      <span class="public-training-meta-dot"></span>
                      <span>{{ t.scheduled_date }}</span>
                      <span class="public-training-meta-dot"></span>
                      <span>Intentos {{ attemptsUsed(t) }}/{{ maxAttempts(t) }}</span>
                    </div>
                  </div>
                </div>
                <a
                  *ngIf="attemptsRemaining(t) > 0 || isAttemptInProgress(t)"
                  [routerLink]="['/public/trainings', t.id, 'take']"
                  class="btn public-training-action"
                >
                  {{
                    t.material_with_indexation
                      ? (isAttemptInProgress(t) ? 'Continuar video guiado' : 'Abrir video guiado')
                      : (isAttemptInProgress(t) ? 'Continuar' : (attemptsUsed(t) > 0 ? 'Volver a presentar' : 'Realizar'))
                  }}
                </a>
                <span *ngIf="attemptsRemaining(t) <= 0 && !isAttemptInProgress(t)" class="public-training-locked-badge">
                  Intentos agotados
                </span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="tab === 'completed'" class="public-dashboard-section">
          <div *ngIf="completed.length === 0" class="public-dashboard-empty">
            <span class="material-symbols-outlined">incomplete_circle</span>
            <h3>Aún no has completado capacitaciones</h3>
            <p>Cuando termines una capacitación, aqui podrás revisar tu puntaje y descargar tu resultado.</p>
          </div>

          <div *ngFor="let group of completedGroups" class="public-dashboard-group">
            <div class="public-dashboard-group-header">
              <div class="public-dashboard-program-heading">
                <div class="public-dashboard-program-logo" [class.has-logo]="group.category?.empresa?.logo_url">
                  <img
                    *ngIf="group.category?.empresa?.logo_url as logoUrl"
                    [src]="logoUrl"
                    [alt]="'Logo de ' + (group.category?.empresa?.name || 'la empresa')"
                  />
                  <span *ngIf="!group.category?.empresa?.logo_url" class="material-symbols-outlined">business</span>
                </div>
                <div>
                  <div class="public-dashboard-group-kicker">Programa</div>
                  <h2 class="public-dashboard-group-title mb-0">{{ categoryLabel(group.category) }}</h2>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="public-dashboard-group-badge">{{ group.trainings.length }}</span>
                <button class="btn public-dashboard-group-toggle" type="button" (click)="toggleCompletedGroup(group.category)">
                  {{ isCompletedGroupExpanded(group.category) ? 'Ocultar capacitaciones' : 'Abrir capacitaciones' }}
                </button>
              </div>
            </div>

            <div *ngIf="isCompletedGroupExpanded(group.category)" class="public-dashboard-group-body">
              <div *ngFor="let t of group.trainings" class="public-training-item public-training-item-completed">
                <div class="public-training-item-main">
                  <div class="public-training-item-icon public-training-item-icon-completed">
                    <span class="material-symbols-outlined">workspace_premium</span>
                  </div>
                  <div>
                    <h3 class="public-training-item-title mb-1">{{ t.title }}</h3>
                    <div class="public-training-item-meta">
                      <span>Resultado final</span>
                      <span class="public-training-meta-dot"></span>
                      <span *ngIf="t.participants && t.participants[0]?.completed_at">{{ t.participants[0].completed_at | date:'shortDate' }}</span>
                      <span *ngIf="!t.participants || !t.participants[0]?.completed_at">Pendiente de revisión</span>
                      <span class="public-training-meta-dot"></span>
                      <span>Intentos {{ attemptsUsed(t) }}/{{ maxAttempts(t) }}</span>
                    </div>
                  </div>
                </div>

                <div class="public-training-result-wrap">
                  <div *ngIf="t.participants && t.participants[0]" class="public-training-score">
                    <span
                      *ngIf="t.participants[0].score !== null && t.participants[0].score !== undefined"
                      [class]="'badge rounded-pill public-training-score-badge ' + (t.participants[0].score >= t.passing_score ? 'is-approved' : 'is-rejected')"
                    >
                      {{ t.participants[0].score }}%
                    </span>
                    <span *ngIf="t.participants[0].score === null || t.participants[0].score === undefined" class="badge rounded-pill public-training-score-badge is-pending">
                      Pendiente de revision
                    </span>
                  </div>

                  <div class="d-flex flex-wrap gap-2 justify-content-end">
                    <a *ngIf="hasResult(t)" [routerLink]="['/public/trainings', t.id, 'result']" class="btn public-training-result-btn">
                      Ver resultado
                    </a>
                    <a
                      *ngIf="attemptsRemaining(t) > 0 || isAttemptInProgress(t)"
                      [routerLink]="['/public/trainings', t.id, 'take']"
                      class="btn public-training-action"
                    >
                      {{
                        t.material_with_indexation
                          ? (isAttemptInProgress(t) ? 'Continuar video guiado' : 'Abrir video guiado')
                          : (isAttemptInProgress(t) ? 'Continuar' : 'Volver a presentar')
                      }}
                    </a>
                    <span *ngIf="!hasResult(t) && attemptsRemaining(t) <= 0 && !isAttemptInProgress(t)" class="public-training-locked-badge">
                      Intentos agotados
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-privacy-consent-modal
      [open]="consentOpen"
      (accepted)="acceptPrivacyConsent()"
      (declined)="declinePrivacyConsent()"
    ></app-privacy-consent-modal>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .public-dashboard-shell {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.16), transparent 28%),
        linear-gradient(135deg, #07111f 0%, #0b1730 40%, #102a4d 100%);
      color: #eaf1ff;
    }

    .public-dashboard-shell::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 54px 54px;
      mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent 92%);
      pointer-events: none;
      opacity: 0.45;
    }

    .public-dashboard-backdrop,
    .public-dashboard-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(8px);
    }

    .public-dashboard-backdrop {
      width: 30rem;
      height: 30rem;
      right: -8rem;
      top: -8rem;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.18), transparent 70%);
    }

    .public-dashboard-orb {
      width: 16rem;
      height: 16rem;
      opacity: 0.55;
    }

    .public-dashboard-orb-a {
      left: -6rem;
      top: 14%;
      background: radial-gradient(circle, rgba(103, 232, 249, 0.18), transparent 68%);
    }

    .public-dashboard-orb-b {
      right: 7%;
      bottom: 10%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.16), transparent 68%);
    }

    .public-dashboard-container {
      position: relative;
      z-index: 1;
    }

    .public-dashboard-hero,
    .public-dashboard-group,
    .public-dashboard-stat,
    .public-dashboard-tabs,
    .public-dashboard-empty {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(9, 16, 32, 0.62);
      backdrop-filter: blur(18px);
      box-shadow: 0 22px 60px rgba(2, 8, 23, 0.38);
    }

    .public-dashboard-hero {
      border-radius: 28px;
      padding: 1.75rem;
    }

    .public-dashboard-kicker,
    .public-dashboard-group-kicker,
    .public-dashboard-stat-label,
    .public-dashboard-identity-label {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.72rem;
      color: rgba(191, 219, 254, 0.8);
      font-weight: 700;
    }

    .public-dashboard-title {
      font-size: clamp(2rem, 3vw, 3rem);
      line-height: 1.02;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #f8fbff;
    }

    .public-dashboard-subtitle {
      max-width: 56rem;
      color: rgba(226, 232, 240, 0.84);
      line-height: 1.7;
    }

    .public-dashboard-logout-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 999px;
      padding: 0.85rem 1.2rem;
      font-weight: 700;
      color: #f8fbff;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .public-dashboard-logout-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .public-dashboard-identity {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.95rem 1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      min-width: min(100%, 18rem);
    }

    .public-dashboard-identity .material-symbols-outlined {
      color: #67e8f9;
      font-size: 1.35rem;
    }

    .public-dashboard-identity-value {
      font-size: 1rem;
      color: #f8fbff;
      font-weight: 700;
    }

    .public-dashboard-stat {
      display: flex;
      align-items: center;
      gap: 1rem;
      border-radius: 22px;
      padding: 1.15rem 1.2rem;
      min-height: 100%;
    }

    .public-dashboard-stat-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 1rem;
      display: grid;
      place-items: center;
      color: #fff;
      flex: 0 0 auto;
    }

    .public-dashboard-stat-icon .material-symbols-outlined {
      font-size: 1.35rem;
    }

    .public-dashboard-stat-icon-pending {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(245, 158, 11, 0.18));
      color: #fde68a;
    }

    .public-dashboard-stat-icon-completed {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(16, 185, 129, 0.16));
      color: #86efac;
    }

    .public-dashboard-stat-icon-total {
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(125, 211, 252, 0.16));
      color: #bfdbfe;
    }

    .public-dashboard-stat-value {
      font-size: 2rem;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #f8fbff;
      margin-top: 0.2rem;
    }

    .public-dashboard-tabs {
      border-radius: 1.25rem;
      padding: 0.45rem;
      display: inline-flex;
      gap: 0.45rem;
    }

    .public-dashboard-tab {
      appearance: none;
      border: 0;
      border-radius: 1rem;
      padding: 0.85rem 1.1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      color: rgba(226, 232, 240, 0.8);
      background: transparent;
      font-weight: 700;
      transition: background 160ms ease, color 160ms ease, transform 160ms ease;
    }

    .public-dashboard-tab:hover {
      color: #fff;
      transform: translateY(-1px);
    }

    .public-dashboard-tab.is-active {
      background: linear-gradient(135deg, rgba(125, 211, 252, 0.2), rgba(147, 197, 253, 0.18));
      color: #f8fbff;
      box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.18);
    }

    .public-dashboard-tab-badge,
    .public-dashboard-group-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.9rem;
      height: 1.9rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f8fbff;
      font-size: 0.8rem;
      font-weight: 800;
    }

    .public-dashboard-section {
      display: grid;
      gap: 1rem;
    }

    .public-dashboard-group {
      border-radius: 24px;
      overflow: hidden;
    }

    .public-dashboard-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.2rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-dashboard-program-heading {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
    }

    .public-dashboard-program-logo {
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 1rem;
      display: grid;
      place-items: center;
      overflow: hidden;
      flex: 0 0 auto;
      color: #7dd3fc;
      background: rgba(125, 211, 252, 0.1);
      border: 1px solid rgba(125, 211, 252, 0.16);
    }

    .public-dashboard-program-logo.has-logo {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(255, 255, 255, 0.28);
    }

    .public-dashboard-program-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 0.3rem;
    }

    .public-dashboard-program-logo .material-symbols-outlined {
      font-size: 1.45rem;
    }

    .public-dashboard-group-title {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #f8fbff;
    }

    .public-dashboard-group-toggle {
      border-radius: 999px;
      padding: 0.75rem 1rem;
      color: #d9f0ff;
      border: 1px solid rgba(125, 211, 252, 0.22);
      background: rgba(125, 211, 252, 0.08);
      font-weight: 700;
    }

    .public-dashboard-group-toggle:hover {
      color: #fff;
      background: rgba(125, 211, 252, 0.14);
    }

    .public-dashboard-group-body {
      padding: 1rem;
      display: grid;
      gap: 0.8rem;
    }

    .public-training-item {
      border-radius: 18px;
      padding: 1rem 1rem 1rem 1.1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .public-training-item:hover {
      background: rgba(255, 255, 255, 0.055);
    }

    .public-training-item-main {
      display: flex;
      align-items: center;
      gap: 0.95rem;
      min-width: 0;
      flex: 1 1 auto;
    }

    .public-training-item-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 1rem;
      display: grid;
      place-items: center;
      color: #7dd3fc;
      background: rgba(125, 211, 252, 0.1);
      flex: 0 0 auto;
    }

    .public-training-item-icon-completed {
      color: #86efac;
      background: rgba(34, 197, 94, 0.1);
    }

    .public-training-item-icon .material-symbols-outlined {
      font-size: 1.4rem;
    }

    .public-training-item-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fbff;
    }

    .public-training-item-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.55rem;
      color: rgba(191, 219, 254, 0.72);
      font-size: 0.9rem;
    }

    .public-training-meta-dot {
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 999px;
      background: rgba(191, 219, 254, 0.45);
    }

    .public-training-action,
    .public-training-result-btn {
      border-radius: 999px;
      padding: 0.82rem 1.1rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .public-training-action {
      color: #06213f;
      background: linear-gradient(135deg, #7dd3fc 0%, #93c5fd 45%, #c4b5fd 100%);
      border: 0;
      box-shadow: 0 16px 26px rgba(96, 165, 250, 0.18);
    }

    .public-training-action:hover {
      color: #041527;
      filter: brightness(1.03);
    }

    .public-training-result-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 0 0 auto;
    }

    .public-training-score {
      display: flex;
      align-items: center;
    }

    .public-training-score-badge {
      padding: 0.7rem 1rem;
      font-size: 0.9rem;
      letter-spacing: 0.01em;
    }

    .public-training-score-badge.is-approved {
      background: rgba(34, 197, 94, 0.18);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.22);
    }

    .public-training-score-badge.is-rejected {
      background: rgba(248, 113, 113, 0.16);
      color: #fca5a5;
      border: 1px solid rgba(248, 113, 113, 0.22);
    }

    .public-training-score-badge.is-pending {
      background: rgba(251, 191, 36, 0.16);
      color: #fde68a;
      border: 1px solid rgba(251, 191, 36, 0.22);
    }

    .public-training-result-btn {
      border: 1px solid rgba(125, 211, 252, 0.22);
      background: rgba(255, 255, 255, 0.04);
      color: #d9f0ff;
    }

    .public-training-result-btn:hover {
      color: #fff;
      background: rgba(125, 211, 252, 0.1);
      border-color: rgba(125, 211, 252, 0.3);
    }

    .public-training-locked-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.82rem 1rem;
      border-radius: 999px;
      border: 1px solid rgba(248, 113, 113, 0.22);
      background: rgba(127, 29, 29, 0.2);
      color: #fecaca;
      font-weight: 700;
      white-space: nowrap;
    }

    .public-dashboard-empty {
      border-radius: 24px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: rgba(226, 232, 240, 0.84);
    }

    .public-dashboard-empty .material-symbols-outlined {
      display: inline-grid;
      place-items: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 1rem;
      margin-bottom: 1rem;
      color: #7dd3fc;
      background: rgba(125, 211, 252, 0.08);
      font-size: 1.4rem;
    }

    .public-dashboard-empty h3 {
      font-size: 1.4rem;
      color: #f8fbff;
      font-weight: 800;
    }

    .public-dashboard-empty p {
      margin-bottom: 0;
      max-width: 42rem;
      margin-left: auto;
      margin-right: auto;
    }

    @media (max-width: 991.98px) {
      .public-dashboard-hero,
      .public-dashboard-group,
      .public-dashboard-stat {
        border-radius: 22px;
      }

      .public-training-item {
        align-items: flex-start;
        flex-direction: column;
      }

      .public-training-result-wrap {
        width: 100%;
        justify-content: space-between;
      }
    }

    @media (max-width: 575.98px) {
      .public-dashboard-hero {
        padding: 1.25rem;
      }

      .public-dashboard-title {
        font-size: 1.8rem;
      }

      .public-dashboard-stat-value {
        font-size: 1.65rem;
      }

      .public-dashboard-group-header,
      .public-dashboard-group-body {
        padding-left: 0.9rem;
        padding-right: 0.9rem;
      }

      .public-dashboard-group-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .public-dashboard-group-toggle,
      .public-training-action,
      .public-training-result-btn {
        width: 100%;
        justify-content: center;
      }

      .public-training-result-wrap {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class PublicDashboardComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  user: PublicUser | null = null;
  pending: Training[] = [];
  completed: Training[] = [];
  tab: 'pending' | 'completed' = 'pending';
  expandedPendingProgramKeys = new Set<string>();
  expandedCompletedProgramKeys = new Set<string>();
  consentOpen = false;
  consentLoading = false;

  get totalAssigned(): number {
    return this.pending.length + this.completed.length;
  }

  ngOnInit(): void {
    const stored = localStorage.getItem('public_user');
    if (stored) {
      this.user = JSON.parse(stored);
    }

    this.consentOpen = !!this.user && !this.user.privacy_consent_accepted_at;

    this.loadPending();
    this.loadCompleted();
  }

  loadPending(): void {
    this.loadingService.track(this.trainingService.getPending()).subscribe({
      next: (data) => (this.pending = data)
    });
  }

  loadCompleted(): void {
    this.loadingService.track(this.trainingService.getCompleted()).subscribe({
      next: (data) => (this.completed = data)
    });
  }

  get pendingGroups(): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    return this.groupTrainings(this.pending);
  }

  get completedGroups(): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    return this.groupTrainings(this.completed);
  }

  logout(): void {
    localStorage.removeItem('public_token');
    localStorage.removeItem('public_user');
    this.router.navigate(['/public/trainings']);
  }

  acceptPrivacyConsent(): void {
    if (this.consentLoading) {
      return;
    }

    this.consentLoading = true;
    this.trainingService.acceptPublicPrivacyConsent().subscribe({
      next: (response) => {
        if (response.user) {
          this.user = {
            ...(this.user ?? { id: response.user.id, name: response.user.name, document_number: response.user.document_number }),
            ...response.user
          };
          localStorage.setItem('public_user', JSON.stringify(this.user));
        }

        this.consentOpen = false;
        this.consentLoading = false;
      },
      error: () => {
        this.consentLoading = false;
      }
    });
  }

  declinePrivacyConsent(): void {
    localStorage.removeItem('public_token');
    localStorage.removeItem('public_user');
    this.router.navigate(['/public/trainings']);
  }

  participantFor(training: Training): NonNullable<Training['participants']>[number] | null {
    return training.participants?.[0] ?? null;
  }

  maxAttempts(training: Training): number {
    return Math.max(training.max_attempts ?? 1, 1);
  }

  attemptsUsed(training: Training): number {
    return Math.max(this.participantFor(training)?.attempts_count ?? 0, 0);
  }

  attemptsRemaining(training: Training): number {
    return Math.max(this.maxAttempts(training) - this.attemptsUsed(training), 0);
  }

  isAttemptInProgress(training: Training): boolean {
    const participant = this.participantFor(training);

    return !!participant?.attempt_started_at && !participant.completed_at;
  }

  hasResult(training: Training): boolean {
    const participant = this.participantFor(training);

    if (!participant) {
      return false;
    }

    return (
      (participant.completed_at !== null && participant.completed_at !== undefined) ||
      (participant.score !== null && participant.score !== undefined)
    );
  }

  categoryLabel(category: TrainingCategory | null): string {
    return category?.name || 'Sin programa';
  }

  programKey(category: TrainingCategory | null): string {
    return category ? `program-${category.id}` : 'program-uncategorized';
  }

  isPendingGroupExpanded(category: TrainingCategory | null): boolean {
    return this.expandedPendingProgramKeys.has(this.programKey(category));
  }

  isCompletedGroupExpanded(category: TrainingCategory | null): boolean {
    return this.expandedCompletedProgramKeys.has(this.programKey(category));
  }

  togglePendingGroup(category: TrainingCategory | null): void {
    const key = this.programKey(category);

    if (this.expandedPendingProgramKeys.has(key)) {
      this.expandedPendingProgramKeys.delete(key);
      return;
    }

    this.expandedPendingProgramKeys.add(key);
  }

  toggleCompletedGroup(category: TrainingCategory | null): void {
    const key = this.programKey(category);

    if (this.expandedCompletedProgramKeys.has(key)) {
      this.expandedCompletedProgramKeys.delete(key);
      return;
    }

    this.expandedCompletedProgramKeys.add(key);
  }

  private groupTrainings(trainings: Training[]): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    const groups = new Map<string, { category: TrainingCategory | null; trainings: Training[] }>();

    trainings.forEach((training) => {
      const category = training.category ?? null;
      const key = category ? `category-${category.id}` : 'uncategorized';

      if (!groups.has(key)) {
        groups.set(key, { category, trainings: [] });
      }

      groups.get(key)?.trainings.push(training);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (!left.category && !right.category) {
        return 0;
      }

      if (!left.category) {
        return 1;
      }

      if (!right.category) {
        return -1;
      }

      const orderDiff = (left.category.sort_order ?? 0) - (right.category.sort_order ?? 0);
      return orderDiff !== 0 ? orderDiff : left.category.name.localeCompare(right.category.name);
    });
  }
}
