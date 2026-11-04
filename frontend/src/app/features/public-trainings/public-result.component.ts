import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingResult } from '../../core/services/training.service';

@Component({
  selector: 'app-public-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="public-result-shell">
      <div class="public-result-backdrop"></div>
      <div class="public-result-orb public-result-orb-a"></div>
      <div class="public-result-orb public-result-orb-b"></div>

      <div class="container public-result-container py-4 py-xl-5">
        <div *ngIf="loading" class="public-result-loading">
          <div class="spinner-border text-info" role="status"></div>
          <p class="mb-0 mt-3">Cargando resultado...</p>
        </div>

        <div *ngIf="error" class="alert alert-danger public-result-alert">{{ error }}</div>

        <div *ngIf="result" class="public-result-card">
          <div class="public-result-hero">
            <div class="public-result-hero-copy">
              <div class="public-result-kicker">Resultado</div>
              <h1 class="public-result-title mb-2">{{ result.training.title }}</h1>
              <p class="public-result-subtitle mb-0">
                Revisa tu calificación final y descarga tu certificado si aprobaste la evaluación.
              </p>
            </div>
            <div class="public-result-hero-stat">
              <div class="public-result-stat-pill">
                <span class="material-symbols-outlined">{{ resultStatusIcon() }}</span>
                <span class="public-result-stat-value">{{ result.score ?? 'N/A' }}%</span>
              </div>
              <span class="badge rounded-pill public-result-badge" [class]="resultBadgeClass()">
                {{ resultBadgeLabel() }}
              </span>
            </div>
          </div>

          <div class="public-result-body">
            <div class="public-result-meta">
              <div class="public-result-meta-item">
                <span class="material-symbols-outlined">speed</span>
                <div>
                  <div class="public-result-meta-label">Evaluado con</div>
                  <div class="public-result-meta-value">{{ result.training.passing_score }}%</div>
                </div>
              </div>
              <div class="public-result-meta-item">
                <span class="material-symbols-outlined">calendar_today</span>
                <div>
                  <div class="public-result-meta-label">Fecha de finalización</div>
                  <div class="public-result-meta-value">{{ result.completed_at | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>
              </div>
              <div class="public-result-meta-item">
                <span class="material-symbols-outlined">rule</span>
                <div>
                  <div class="public-result-meta-label">Puntaje mínimo requerido</div>
                  <div class="public-result-meta-value">{{ result.training.passing_score }}%</div>
                </div>
              </div>
            </div>

            <div class="public-result-actions">
              <button class="btn public-result-primary-btn" (click)="downloadCertificate()" [disabled]="result.passed !== true">
                <span class="material-symbols-outlined">download</span>
                <span>Descargar Certificado</span>
              </button>
              <button class="btn public-result-secondary-btn" (click)="viewCertificate()" [disabled]="result.passed !== true">
                <span class="material-symbols-outlined">visibility</span>
                <span>Ver Certificado</span>
              </button>
              <a routerLink="/public/trainings/dashboard" class="btn public-result-outline-btn">
                <span class="material-symbols-outlined">home</span>
                <span>Volver al inicio</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .public-result-shell {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.16), transparent 28%),
        linear-gradient(135deg, #07111f 0%, #0b1730 40%, #102a4d 100%);
      color: #eaf1ff;
    }

    .public-result-shell::before {
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

    .public-result-backdrop,
    .public-result-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(8px);
    }

    .public-result-backdrop {
      width: 30rem;
      height: 30rem;
      right: -8rem;
      top: -8rem;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.18), transparent 70%);
    }

    .public-result-orb {
      width: 16rem;
      height: 16rem;
      opacity: 0.55;
    }

    .public-result-orb-a {
      left: -6rem;
      top: 14%;
      background: radial-gradient(circle, rgba(103, 232, 249, 0.18), transparent 68%);
    }

    .public-result-orb-b {
      right: 7%;
      bottom: 10%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.16), transparent 68%);
    }

    .public-result-container {
      position: relative;
      z-index: 1;
    }

    .public-result-loading {
      min-height: 60vh;
      display: grid;
      place-items: center;
      text-align: center;
      color: rgba(226, 232, 240, 0.85);
    }

    .public-result-card {
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(9, 16, 32, 0.62);
      backdrop-filter: blur(18px);
      box-shadow: 0 22px 60px rgba(2, 8, 23, 0.38);
      overflow: hidden;
    }

    .public-result-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      padding: 1.75rem 1.75rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(135deg, rgba(125, 211, 252, 0.09), rgba(147, 197, 253, 0.04));
    }

    .public-result-hero-copy {
      flex: 1 1 0;
      min-width: 0;
    }

    .public-result-kicker {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.72rem;
      color: rgba(191, 219, 254, 0.8);
      font-weight: 700;
      margin-bottom: 0.45rem;
    }

    .public-result-title {
      font-size: clamp(1.6rem, 3vw, 2.4rem);
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #f8fbff;
      margin-bottom: 0.35rem;
    }

    .public-result-subtitle {
      max-width: 38rem;
      color: rgba(226, 232, 240, 0.84);
      line-height: 1.7;
    }

    .public-result-hero-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .public-result-stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.85rem 1.1rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-result-stat-pill .material-symbols-outlined {
      color: #7dd3fc;
      font-size: 1.35rem;
    }

    .public-result-stat-value {
      font-size: 1.5rem;
      line-height: 1;
      font-weight: 800;
      color: #f8fbff;
    }

    .public-result-badge {
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      font-weight: 800;
      text-transform: uppercase;
    }

    .public-result-badge.is-approved {
      background: rgba(34, 197, 94, 0.18);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.22);
    }

    .public-result-badge.is-rejected {
      background: rgba(248, 113, 113, 0.16);
      color: #fca5a5;
      border: 1px solid rgba(248, 113, 113, 0.22);
    }

    .public-result-badge.is-pending {
      background: rgba(251, 191, 36, 0.16);
      color: #fde68a;
      border: 1px solid rgba(251, 191, 36, 0.22);
    }

    .public-result-body {
      padding: 1.5rem 1.75rem 1.75rem;
    }

    .public-result-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .public-result-meta-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.1rem;
      border-radius: 1.1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-result-meta-item .material-symbols-outlined {
      color: #7dd3fc;
      font-size: 1.25rem;
      margin-top: 0.15rem;
      flex-shrink: 0;
    }

    .public-result-meta-label {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.68rem;
      font-weight: 700;
      color: rgba(191, 219, 254, 0.78);
      margin-bottom: 0.2rem;
    }

    .public-result-meta-value {
      font-size: 1rem;
      font-weight: 800;
      color: #f8fbff;
      line-height: 1.2;
    }

    .public-result-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      align-items: center;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-result-primary-btn,
    .public-result-secondary-btn,
    .public-result-outline-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 999px;
      padding: 0.85rem 1.25rem;
      font-weight: 700;
      border: 1px solid transparent;
      text-decoration: none;
      cursor: pointer;
      transition: filter 0.2s ease, transform 0.2s ease;
    }

    .public-result-primary-btn {
      color: #06213f;
      background: linear-gradient(135deg, #7dd3fc 0%, #93c5fd 45%, #c4b5fd 100%);
      box-shadow: 0 16px 28px rgba(96, 165, 250, 0.2);
    }

    .public-result-primary-btn:hover:not(:disabled) {
      filter: brightness(1.04);
      transform: translateY(-1px);
    }

    .public-result-secondary-btn {
      color: #d9f0ff;
      background: rgba(125, 211, 252, 0.08);
      border-color: rgba(125, 211, 252, 0.18);
    }

    .public-result-secondary-btn:hover:not(:disabled) {
      background: rgba(125, 211, 252, 0.14);
      border-color: rgba(125, 211, 252, 0.3);
    }

    .public-result-outline-btn {
      color: #d9f0ff;
      background: transparent;
      border-color: rgba(125, 211, 252, 0.18);
    }

    .public-result-outline-btn:hover {
      background: rgba(125, 211, 252, 0.08);
      border-color: rgba(125, 211, 252, 0.3);
    }

    .public-result-primary-btn:disabled,
    .public-result-secondary-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      filter: grayscale(0.35);
    }

    .public-result-primary-btn .material-symbols-outlined,
    .public-result-secondary-btn .material-symbols-outlined,
    .public-result-outline-btn .material-symbols-outlined {
      font-size: 1.15rem;
    }

    .public-result-alert {
      border-radius: 1rem;
      border: 1px solid rgba(248, 113, 113, 0.28);
      background: rgba(127, 29, 29, 0.32);
      color: #fee2e2;
    }

    @media (max-width: 991.98px) {
      .public-result-hero {
        flex-direction: column;
        align-items: flex-start;
      }

      .public-result-hero-stat {
        align-items: flex-start;
        width: 100%;
      }

      .public-result-meta {
        grid-template-columns: 1fr;
      }

      .public-result-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .public-result-primary-btn,
      .public-result-secondary-btn,
      .public-result-outline-btn {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 575.98px) {
      .public-result-hero {
        padding: 1.25rem;
      }

      .public-result-body {
        padding: 1.25rem;
      }

      .public-result-title {
        font-size: 1.5rem;
      }
    }

    :host-context(.light) .public-result-shell {
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 28%),
        radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.12), transparent 28%),
        linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #f4f7fb 100%);
      color: #0f172a;
    }

    :host-context(.light) .public-result-shell::before {
      background-image:
        linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
      opacity: 0.4;
    }

    :host-context(.light) .public-result-backdrop {
      background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%);
    }

    :host-context(.light) .public-result-orb-a {
      background: radial-gradient(circle, rgba(103, 232, 249, 0.14), transparent 68%);
    }

    :host-context(.light) .public-result-orb-b {
      background: radial-gradient(circle, rgba(168, 85, 247, 0.12), transparent 68%);
    }

    :host-context(.light) .public-result-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
    }

    :host-context(.light) .public-result-loading {
      color: #475569;
    }

    :host-context(.light) .public-result-hero {
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      background:
        linear-gradient(135deg, rgba(4, 87, 191, 0.06), rgba(4, 87, 191, 0.02));
    }

    :host-context(.light) .public-result-kicker {
      color: #0457bf;
    }

    :host-context(.light) .public-result-title {
      color: #0f172a;
    }

    :host-context(.light) .public-result-subtitle {
      color: #334155;
    }

    :host-context(.light) .public-result-stat-pill {
      background: rgba(255, 255, 255, 0.55);
      border: 1px solid rgba(15, 23, 42, 0.08);
    }

    :host-context(.light) .public-result-stat-pill .material-symbols-outlined {
      color: #0457bf;
    }

    :host-context(.light) .public-result-stat-value {
      color: #0f172a;
    }

    :host-context(.light) .public-result-meta-item {
      background: rgba(255, 255, 255, 0.55);
      border: 1px solid rgba(15, 23, 42, 0.08);
    }

    :host-context(.light) .public-result-meta-item .material-symbols-outlined {
      color: #0457bf;
    }

    :host-context(.light) .public-result-meta-label {
      color: #64748b;
    }

    :host-context(.light) .public-result-meta-value {
      color: #0f172a;
    }

    :host-context(.light) .public-result-actions {
      border-top: 1px solid rgba(15, 23, 42, 0.06);
    }

    :host-context(.light) .public-result-badge.is-approved {
      background: rgba(5, 150, 105, 0.12);
      color: #047857;
      border: 1px solid rgba(5, 150, 105, 0.2);
    }

    :host-context(.light) .public-result-badge.is-rejected {
      background: rgba(244, 63, 94, 0.1);
      color: #be123c;
      border: 1px solid rgba(244, 63, 94, 0.2);
    }

    :host-context(.light) .public-result-badge.is-pending {
      background: rgba(217, 119, 6, 0.12);
      color: #b45309;
      border: 1px solid rgba(217, 119, 6, 0.2);
    }

    :host-context(.light) .public-result-primary-btn {
      color: #06213f;
      background: linear-gradient(135deg, #7dd3fc 0%, #93c5fd 45%, #c4b5fd 100%);
    }

    :host-context(.light) .public-result-secondary-btn {
      color: #0457bf;
      background: rgba(4, 87, 191, 0.08);
      border-color: rgba(4, 87, 191, 0.18);
    }

    :host-context(.light) .public-result-outline-btn {
      color: #0457bf;
      border-color: rgba(4, 87, 191, 0.18);
    }

    :host-context(.light) .public-result-outline-btn:hover {
      background: rgba(4, 87, 191, 0.06);
    }

    :host-context(.light) .public-result-alert {
      border: 1px solid rgba(244, 63, 94, 0.24);
      background: rgba(254, 242, 242, 0.9);
      color: #9f1239;
    }
  `]
})
export class PublicResultComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  result?: TrainingResult;
  loading = true;
  error = '';

  ngOnInit(): void {
    const html = document.documentElement;
    html.classList.remove('dark');
    html.classList.add('light');

    const id = +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.loadResult(id);
  }

  loadResult(id: number): void {
    this.loadingService.track(this.trainingService.getResult(id))
      .subscribe({
        next: (result) => {
          this.result = result;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al cargar resultado.';
          this.loading = false;
        }
      });
  }

  resultStatusIcon(): string {
    if (!this.result) return 'help';
    if (this.result.passed === true) return 'check_circle';
    if (this.result.passed === false) return 'cancel';
    return 'help';
  }

  resultBadgeClass(): string {
    if (!this.result) return 'is-pending';
    if (this.result.passed === true) return 'is-approved';
    if (this.result.passed === false) return 'is-rejected';
    return 'is-pending';
  }

  resultBadgeLabel(): string {
    if (!this.result) return 'PENDIENTE DE REVISION';
    if (this.result.passed === true) return 'APROBADO';
    if (this.result.passed === false) return 'NO APROBADO';
    return 'PENDIENTE DE REVISION';
  }

  downloadCertificate(): void {
    if (!this.result) return;

    this.loadingService.track(this.trainingService.downloadCertificate(this.result.training.id))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `certificado-${this.result!.training.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: async (err) => {
          this.error = await this.extractErrorMessage(err) || 'Error al descargar el certificado.';
        }
      });
  }

  viewCertificate(): void {
    if (!this.result) return;

    this.loadingService.track(this.trainingService.downloadCertificate(this.result.training.id))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        },
        error: async (err) => {
          this.error = await this.extractErrorMessage(err) || 'Error al abrir el certificado.';
        }
      });
  }

  private async extractErrorMessage(err: any): Promise<string> {
    const body = err?.error;

    if (body instanceof Blob) {
      try {
        const text = await body.text();
        const parsed = JSON.parse(text);
        return parsed?.message || '';
      } catch {
        return '';
      }
    }

    return body?.message || '';
  }
}
