import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalShellComponent } from './modal-shell.component';

@Component({
  selector: 'app-privacy-consent-modal',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  template: `
    <app-modal-shell
      *ngIf="open"
      kicker="Ley 1581 de 2012"
      title="Autorización para tratamiento de datos"
      subtitle="Debes aceptar este aviso para continuar con el acceso."
      size="sm"
      headerVariant="warning"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      [showFooterClose]="false"
      primaryLabel="Acepto"
      secondaryLabel="No acepto"
      (primaryRequested)="accepted.emit()"
      (secondaryRequested)="declined.emit()"
      (closeRequested)="declined.emit()"
    >
      <div modal-body class="d-flex flex-column gap-3 text-on-surface">
        <div class="alert alert-warning mb-0">
          En cumplimiento de la Ley 1581 de 2012, autorizas el tratamiento de tus datos personales para gestionar tu acceso, tus capacitaciones y tu historial dentro de la plataforma.
        </div>

        <div class="privacy-consent-note text-on-surface">
          <div class="privacy-consent-note__title text-on-surface">Al continuar aceptas que:</div>
          <ul class="privacy-consent-note__list mb-0 text-on-surface-variant">
            <li>Tu información se usará para fines operativos y de seguridad.</li>
            <li>Podemos registrar tu actividad dentro del sistema para trazabilidad.</li>
            <li>Si no aceptas, no podrás seguir con el ingreso.</li>
          </ul>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .privacy-consent-note {
      padding: 1rem;
      border-radius: 1rem;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(148, 163, 184, 0.06);
    }

    .privacy-consent-note__title {
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .privacy-consent-note__list {
      padding-left: 1.15rem;
    }

    .privacy-consent-note__list li + li {
      margin-top: 0.35rem;
    }
  `]
})
export class PrivacyConsentModalComponent {
  @Input() open = false;
  @Output() accepted = new EventEmitter<void>();
  @Output() declined = new EventEmitter<void>();
}
