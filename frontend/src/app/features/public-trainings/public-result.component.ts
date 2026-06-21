import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingResult } from '../../core/services/training.service';

@Component({
  selector: 'app-public-result',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbAlertModule],
  template: `
    <div class="container py-4">
      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <div *ngIf="result" class="card">
        <div class="card-body text-center py-5">
          <div *ngIf="result.passed === true" class="display-1 text-success mb-3">&#10004;</div>
          <div *ngIf="result.passed === false" class="display-1 text-danger mb-3">&#10008;</div>
          <div *ngIf="result.passed === null" class="display-1 text-warning mb-3">?</div>

          <h3 class="mb-2">{{ result.training.title }}</h3>

          <div class="my-4">
            <span
              class="display-4 fw-bold"
              [class.text-success]="result.passed === true"
              [class.text-danger]="result.passed === false"
              [class.text-warning]="result.passed === null"
            >
              {{ result.score ?? 'N/A' }}%
            </span>
          </div>

          <p class="mb-1">
            <strong>Evaluado con:</strong> {{ result.training.passing_score }}%
          </p>

          <div class="mb-3">
            <span
              [class]="'badge fs-5 py-2 px-4 ' + (result.passed === true ? 'bg-success' : result.passed === false ? 'bg-danger' : 'bg-warning text-dark')"
            >
              {{ result.passed === true ? 'APROBADO' : result.passed === false ? 'NO APROBADO' : 'PENDIENTE DE REVISION' }}
            </span>
          </div>

          <p class="text-muted">
            Puntaje minimo requerido: {{ result.training.passing_score }}%
          </p>
          <p class="text-muted">
            Fecha: {{ result.completed_at | date:'dd/MM/yyyy HH:mm' }}
          </p>

          <div class="mt-4">
            <button class="btn btn-primary me-2" (click)="downloadCertificate()" [disabled]="result.passed !== true">
              Descargar Certificado
            </button>
            <a routerLink="/public/trainings/dashboard" class="btn btn-outline-secondary">
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  `
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
