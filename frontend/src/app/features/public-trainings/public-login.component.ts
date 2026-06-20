import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService } from '../../core/services/training.service';

@Component({
  selector: 'app-public-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbAlertModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div class="card shadow" style="width: 400px;">
        <div class="card-body p-4 text-center">
          <h3 class="mb-2">Capacitaciones</h3>
          <p class="text-muted mb-4">Ingrese su numero de cedula para acceder</p>

          <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

          <form (ngSubmit)="login()">
            <div class="mb-3">
              <input
                class="form-control form-control-lg text-center"
                [(ngModel)]="documentNumber"
                name="documentNumber"
                placeholder="Numero de cedula"
                required
                autofocus
              />
            </div>
            <button type="submit" class="btn btn-primary w-100" [disabled]="!documentNumber || loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-1"></span>
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  `
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
