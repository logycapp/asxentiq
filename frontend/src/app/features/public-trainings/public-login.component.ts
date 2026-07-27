import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { TrainingService } from '../../core/services/training.service';

@Component({
  selector: 'app-public-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="public-login-shell">
      <div class="public-login-backdrop"></div>
      <div class="public-login-orb public-login-orb-a"></div>
      <div class="public-login-orb public-login-orb-b"></div>

      <div class="container public-login-container">
        <div class="row g-4 align-items-stretch justify-content-center">
          <div class="col-12 col-xl-6 d-flex">
            <div class="public-login-hero w-100">
              <div class="public-login-brand">
                <div class="public-login-brand-mark">
                  <span class="material-symbols-outlined">school</span>
                </div>
                <div>
                  <div class="public-login-kicker">Asxentiq SAS</div>
                  <h1 class="public-login-title mb-0">Capacitaciones para participantes</h1>
                </div>
              </div>

              <p class="public-login-copy">
                Accede con tu numero de cedula para ver tus capacitaciones pendientes, revisar resultados y completar tu evaluacion.
              </p>

              <div class="public-login-points">
                <div class="public-login-point">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Acceso rapido y seguro con tu documento</span>
                </div>
                <div class="public-login-point">
                  <span class="material-symbols-outlined">assignment_turned_in</span>
                  <span>Consulta tus capacitaciones activas y resultados</span>
                </div>
                <div class="public-login-point">
                  <span class="material-symbols-outlined">verified_user</span>
                  <span>Experiencia limpia, clara y pensada para participar</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-8 col-xl-4 d-flex">
            <div class="public-login-card w-100">
              <div class="public-login-card-header">
                <div class="badge rounded-pill public-login-badge">Ingreso participante</div>
                <h2 class="public-login-card-title mb-2">Bienvenido</h2>
                <p class="public-login-card-subtitle mb-0">Ingresa tu numero de cedula para continuar.</p>
              </div>

              <div *ngIf="errorMessage" class="alert alert-danger public-login-alert">{{ errorMessage }}</div>

              <form (ngSubmit)="login()" class="public-login-form">
                <label class="form-label public-login-label" for="documentNumber">Numero de cedula</label>
                <div class="public-login-input-wrap">
                  <span class="material-symbols-outlined public-login-input-icon">badge</span>
                  <input
                    id="documentNumber"
                    class="form-control public-login-input"
                    [(ngModel)]="documentNumber"
                    name="documentNumber"
                    placeholder="Ej. 1032449907"
                    required
                    autofocus
                  />
                </div>

                <button type="submit" class="btn public-login-button w-100" [disabled]="!documentNumber || loading">
                  <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Ingresar
                </button>
              </form>
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

    .public-login-shell {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.26), transparent 28%),
        radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.24), transparent 26%),
        linear-gradient(135deg, #07111f 0%, #0b1730 42%, #102a4d 100%);
      color: #eaf1ff;
    }

    .public-login-shell::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
      background-size: 54px 54px;
      mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent 92%);
      pointer-events: none;
      opacity: 0.55;
    }

    .public-login-backdrop,
    .public-login-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(6px);
    }

    .public-login-backdrop {
      inset: auto;
      width: 28rem;
      height: 28rem;
      right: -7rem;
      top: -7rem;
      background: radial-gradient(circle, rgba(103, 232, 249, 0.18), transparent 70%);
    }

    .public-login-orb {
      width: 14rem;
      height: 14rem;
      opacity: 0.6;
    }

    .public-login-orb-a {
      left: -5rem;
      top: 12%;
      background: radial-gradient(circle, rgba(96, 165, 250, 0.26), transparent 68%);
    }

    .public-login-orb-b {
      right: 8%;
      bottom: 8%;
      background: radial-gradient(circle, rgba(34, 211, 238, 0.18), transparent 68%);
    }

    .public-login-container {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding-top: 2rem;
      padding-bottom: 2rem;
    }

    .public-login-hero,
    .public-login-card {
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(9, 16, 32, 0.62);
      backdrop-filter: blur(22px);
      box-shadow: 0 28px 80px rgba(2, 8, 23, 0.45);
    }

    .public-login-hero {
      border-radius: 28px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
    }

    .public-login-brand {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .public-login-brand-mark {
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 1rem;
      display: grid;
      place-items: center;
      color: #0f172a;
      background: linear-gradient(135deg, #7dd3fc 0%, #a5b4fc 100%);
      box-shadow: 0 14px 30px rgba(96, 165, 250, 0.28);
    }

    .public-login-brand-mark .material-symbols-outlined {
      font-size: 1.5rem;
    }

    .public-login-kicker {
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 0.72rem;
      font-weight: 700;
      color: rgba(191, 219, 254, 0.86);
      margin-bottom: 0.35rem;
    }

    .public-login-title {
      font-size: clamp(2rem, 3vw, 3.25rem);
      line-height: 1.02;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #f8fbff;
      max-width: 11ch;
    }

    .public-login-copy {
      margin: 0;
      max-width: 40rem;
      color: rgba(226, 232, 240, 0.86);
      font-size: 1.05rem;
      line-height: 1.7;
    }

    .public-login-points {
      display: grid;
      gap: 0.9rem;
      margin-top: 2rem;
    }

    .public-login-point {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 0.9rem 1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(241, 245, 249, 0.92);
    }

    .public-login-point .material-symbols-outlined {
      color: #67e8f9;
      font-size: 1.2rem;
    }

    .public-login-card {
      border-radius: 30px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .public-login-card-header {
      margin-bottom: 1.6rem;
    }

    .public-login-badge {
      background: rgba(125, 211, 252, 0.14);
      border: 1px solid rgba(125, 211, 252, 0.24);
      color: #d9f0ff;
      font-size: 0.78rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 0.55rem 0.9rem;
      margin-bottom: 1rem;
    }

    .public-login-card-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #f8fbff;
    }

    .public-login-card-subtitle {
      color: rgba(191, 219, 254, 0.74);
    }

    .public-login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .public-login-label {
      color: rgba(226, 232, 240, 0.82);
      font-weight: 600;
      margin-bottom: 0;
    }

    .public-login-input-wrap {
      position: relative;
    }

    .public-login-input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(125, 211, 252, 0.9);
      font-size: 1.2rem;
      pointer-events: none;
    }

    .public-login-input {
      height: 3.6rem;
      padding-left: 3rem;
      border-radius: 1rem;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.72);
      color: #f8fbff;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .public-login-input::placeholder {
      color: rgba(148, 163, 184, 0.82);
    }

    .public-login-input:focus {
      border-color: rgba(125, 211, 252, 0.95);
      box-shadow: 0 0 0 0.22rem rgba(59, 130, 246, 0.2);
      background: rgba(15, 23, 42, 0.88);
      color: #ffffff;
    }

    .public-login-button {
      height: 3.5rem;
      border-radius: 1rem;
      border: 0;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #06213f;
      background: linear-gradient(135deg, #7dd3fc 0%, #93c5fd 45%, #c4b5fd 100%);
      box-shadow: 0 18px 30px rgba(96, 165, 250, 0.25);
      transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
    }

    .public-login-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 22px 34px rgba(96, 165, 250, 0.32);
      filter: brightness(1.02);
    }

    .public-login-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .public-login-alert {
      border-radius: 1rem;
      border: 1px solid rgba(248, 113, 113, 0.28);
      background: rgba(127, 29, 29, 0.25);
      color: #fee2e2;
    }

    @media (max-width: 991.98px) {
      .public-login-container {
        padding-top: 1.25rem;
        padding-bottom: 1.25rem;
      }

      .public-login-hero,
      .public-login-card {
        border-radius: 24px;
      }
    }

    @media (max-width: 575.98px) {
      .public-login-hero,
      .public-login-card {
        padding: 1.25rem;
      }

      .public-login-title {
        font-size: 1.8rem;
      }

      .public-login-card-title {
        font-size: 1.65rem;
      }

      .public-login-point {
        align-items: flex-start;
      }
    }
  `]
})
export class PublicLoginComponent {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  documentNumber = '';
  loading = false;
  errorMessage = '';

  login(): void {
    if (!this.documentNumber.trim()) return;

    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.publicLogin(this.documentNumber.trim()))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          localStorage.setItem('public_token', response.token);
          localStorage.setItem('public_user', JSON.stringify(response.user));
          this.router.navigate(['/public/trainings/dashboard']);
        },
        error: () => {
          this.errorMessage = 'Numero de documento no registrado.';
          this.loading = false;
        }
      });
  }
}
