import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="modal fade show d-block position-fixed top-0 start-0 w-100 h-100 overflow-hidden"
      style="background: rgba(0,0,0,0.5); z-index: 1055;"
      tabindex="-1"
      role="dialog"
    >
      <div class="modal-dialog modal-dialog-scrollable modal-dialog-centered modal-shell-dialog" [ngClass]="sizeClass" role="document">
        <div class="modal-content glass-card border-0 rounded-4 modal-shell-content">
          <div class="modal-themed-header" [ngClass]="'modal-themed-' + headerVariant">
            <div>
              <p *ngIf="kicker" class="font-label-md text-on-surface-variant opacity-75 mb-1">{{ kicker }}</p>
              <h5 class="modal-title font-headline-lg mb-1">{{ title }}</h5>
              <p *ngIf="subtitle" class="modal-subtitle font-label-md mb-0">{{ subtitle }}</p>
            </div>

            <ng-content select="[modal-header-actions]"></ng-content>

            <button
              *ngIf="showHeaderClose"
              type="button"
              class="modal-close-btn p-2 transition-colors active:scale-95"
              aria-label="Cerrar modal"
              (click)="closeRequested.emit()"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <ng-content select="[modal-body]"></ng-content>
          </div>

          <div class="modal-footer border-white/10" *ngIf="showFooter">
            <div class="d-flex w-100 justify-content-between align-items-center gap-3">
              <div>
                <ng-content select="[modal-footer-start]"></ng-content>
              </div>

              <div class="d-flex align-items-center gap-2">
                <ng-content select="[modal-footer-actions]"></ng-content>

                <button
                  *ngIf="showSecondaryButton"
                  type="button"
                  class="btn btn-outline-light fw-semibold"
                  (click)="secondaryRequested.emit()"
                >
                  {{ secondaryLabel }}
                </button>

                <button
                  *ngIf="showPrimaryButton"
                  type="button"
                  class="btn fw-semibold d-inline-flex align-items-center gap-1"
                  [ngClass]="primaryButtonClass"
                  [disabled]="primaryDisabled"
                  (click)="primaryRequested.emit()"
                >
                  <span *ngIf="primaryLoading" class="spinner-border spinner-border-sm"></span>
                  {{ primaryLabel }}
                </button>

                <button
                  *ngIf="showFooterClose"
                  type="button"
                  class="btn btn-outline-light fw-semibold"
                  (click)="closeRequested.emit()"
                >
                  {{ closeLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  ,
  styles: [`
    :host {
      display: block;
    }

    .modal-shell-dialog {
      width: min(100%, var(--modal-shell-width, 1140px));
      height: calc(100vh - 2rem);
      max-height: calc(100vh - 2rem);
      margin: 1rem auto;
      padding: 0 0.75rem;
    }

    .modal-shell-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
    }

    .modal-shell-content .modal-body {
      flex: 1 1 auto;
      overflow: auto;
    }

    .modal-shell-content .modal-footer {
      flex-shrink: 0;
    }

    @media (max-width: 767.98px) {
      .modal-shell-dialog {
        height: calc(100vh - 1rem);
        max-height: calc(100vh - 1rem);
        margin: 0.5rem auto;
        padding: 0 0.5rem;
      }
    }
  `]
})
export class ModalShellComponent {
  @Input() kicker = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() closeLabel = 'Cerrar';
  @Input() primaryLabel = 'Guardar';
  @Input() secondaryLabel = 'Cancelar';
  @Input() showHeaderClose = true;
  @Input() showFooterClose = true;
  @Input() showFooter = true;
  @Input() headerVariant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' = 'primary';
  @Input() footerVariant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | '' = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'lg';
  @Input() showPrimaryButton = false;
  @Input() showSecondaryButton = false;
  @Input() primaryDisabled = false;
  @Input() primaryLoading = false;
  @Output() closeRequested = new EventEmitter<void>();
  @Output() primaryRequested = new EventEmitter<void>();
  @Output() secondaryRequested = new EventEmitter<void>();

  get sizeClass(): string {
    switch (this.size) {
      case 'sm':
        return 'modal-sm';
      case 'xl':
        return 'modal-xl';
      case 'lg':
        return 'modal-lg';
      default:
        return '';
    }
  }

  get primaryButtonClass(): string {
    const variant = this.footerVariant || this.headerVariant;
    return `btn-${variant}`;
  }
}
