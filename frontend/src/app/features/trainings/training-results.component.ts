import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, Training } from '../../core/services/training.service';

@Component({
  selector: 'app-training-results',
  standalone: true,
  imports: [CommonModule, RouterLink, ModalShellComponent],
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
                <th>Asistio</th>
                <th>Puntaje</th>
                <th>Resultado</th>
                <th>Completado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of training?.participants ?? []">
                <td class="fw-semibold">{{ $any(p).full_name || $any(p).name }}</td>
                <td>{{ p.document_number }}</td>
                <td>
                  <span *ngIf="p.pivot.attended === true" class="badge bg-success">Si</span>
                  <span *ngIf="p.pivot.attended === false" class="badge bg-danger">No</span>
                  <span *ngIf="p.pivot.attended === null" class="badge bg-secondary">Pendiente</span>
                </td>
                <td>{{ $any(p.pivot).score !== null ? $any(p.pivot).score + '%' : '-' }}</td>
                <td>
                  <span
                    *ngIf="$any(p.pivot).score !== null"
                    [class]="'badge ' + ($any(p.pivot).score >= (training?.passing_score ?? 70) ? 'bg-success' : 'bg-danger')"
                  >
                    {{ $any(p.pivot).score >= (training?.passing_score ?? 70) ? 'Aprobado' : 'No Aprobado' }}
                  </span>
                </td>
                <td>{{ $any(p.pivot).completed_at ? ($any(p.pivot).completed_at | date:'short') : '-' }}</td>
              </tr>
            </tbody>
          </table>
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

  closeModal(): void {
    this.activeModal?.dismiss('close');
  }
}