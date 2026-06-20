import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-modal-shell">
      <header class="app-modal-shell__header" [ngClass]="'header-' + headerVariant">
        <div class="app-modal-shell__copy">
          <p *ngIf="kicker" class="app-modal-shell__kicker mb-1">{{ kicker }}</p>
          <h4 class="app-modal-shell__title mb-1">{{ title }}</h4>
          <p *ngIf="subtitle" class="app-modal-shell__subtitle mb-0">{{ subtitle }}</p>
        </div>

        <div class="app-modal-shell__header-actions">
          <ng-content select="[modal-header-actions]"></ng-content>
        </div>

        <button
          *ngIf="showHeaderClose"
          type="button"
          class="app-modal-shell__close"
          aria-label="Cerrar modal"
          (click)="closeRequested.emit()"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <section class="app-modal-shell__body">
        <ng-content select="[modal-body]"></ng-content>
      </section>

      <footer class="app-modal-shell__footer" *ngIf="showFooter">
        <div class="app-modal-shell__footer-start">
          <ng-content select="[modal-footer-start]"></ng-content>
        </div>

        <div class="app-modal-shell__footer-actions">
          <ng-content select="[modal-footer-actions]"></ng-content>
        </div>

        <button
          *ngIf="showFooterClose"
          type="button"
          class="btn btn-light app-modal-shell__footer-close"
          (click)="closeRequested.emit()"
        >
          {{ closeLabel }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .app-modal-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 auto;
      overflow: hidden;
      border-radius: 1.5rem;
      background: linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
    }

    .app-modal-shell__header {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 3.5rem 1.25rem 1.4rem;
      color: #fff;
    }

    .header-primary {
      background: linear-gradient(135deg, #1462ff, #1dbbd6);
    }

    .header-success {
      background: linear-gradient(135deg, #28a745, #42d483);
    }

    .header-danger {
      background: linear-gradient(135deg, #dc3545, #e0737e);
    }

    .header-warning {
      background: linear-gradient(135deg, #b8860b, #d4a017);
    }

    .header-info {
      background: linear-gradient(135deg, #17a2b8, #5bc0de);
    }

    .header-dark {
      background: linear-gradient(135deg, #343a40, #565e66);
    }

    .header-secondary {
      background: linear-gradient(135deg, #6c757d, #929ba3);
    }

    .app-modal-shell__copy {
      flex: 1 1 auto;
      min-width: 0;
    }

    .app-modal-shell__kicker {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      opacity: 0.82;
    }

    .app-modal-shell__title {
      font-size: 1.35rem;
      font-weight: 800;
    }

    .app-modal-shell__subtitle {
      opacity: 0.88;
    }

    .app-modal-shell__header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-left: auto;
    }

    .app-modal-shell__close {
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
      flex: 0 0 auto;
    }

    .app-modal-shell__close:hover {
      transform: scale(1.04);
      background: rgba(255, 255, 255, 0.28);
    }

    .app-modal-shell__body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.35rem;
      background: rgba(255, 255, 255, 0.96);
      scrollbar-gutter: stable;
    }

    .app-modal-shell__footer {
      flex-shrink: 0;
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.35rem 1.35rem;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.96);
    }

    .app-modal-shell__footer-start,
    .app-modal-shell__footer-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      min-width: 0;
    }

    .app-modal-shell__footer-actions {
      margin-left: auto;
      justify-content: flex-end;
      flex: 1 1 auto;
    }

    .app-modal-shell__footer-close {
      flex: 0 0 auto;
      margin-left: auto;
    }

    .app-modal-shell__footer .btn {
      min-width: 110px;
    }

    @media (max-width: 576px) {
      .app-modal-shell__header,
      .app-modal-shell__footer {
        flex-direction: column;
        align-items: stretch;
      }

      .app-modal-shell__header {
        padding-right: 1.4rem;
      }

      .app-modal-shell__header-actions,
      .app-modal-shell__footer-actions {
        margin-left: 0;
      }

      .app-modal-shell__footer .btn {
        width: 100%;
      }
    }
  `]
})
export class ModalShellComponent {
  @Input() kicker = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() closeLabel = 'Cerrar';
  @Input() showHeaderClose = true;
  @Input() showFooterClose = true;
  @Input() showFooter = true;
  @Input() headerVariant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' = 'primary';
  @Output() closeRequested = new EventEmitter<void>();
}
