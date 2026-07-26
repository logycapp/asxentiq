import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, HostListener, ElementRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface Select3Option {
  value: number | string | boolean | null;
  label: string;
}

@Component({
  selector: 'app-select3',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select3Component),
      multi: true,
    },
  ],
  template: `
    <div class="searchable-select" [class.open]="isOpen">
      <input type="hidden" [value]="value ?? ''" />
      <button
        type="button"
        class="searchable-select-trigger form-control text-start d-flex justify-content-between align-items-center"
        [class.is-invalid]="isInvalid"
        [attr.aria-invalid]="isInvalid"
        [attr.aria-disabled]="disabled"
        [disabled]="disabled"
        (click)="togglePanel()"
        (keydown.enter)="togglePanel()"
        (keydown.space)="togglePanel()"
        (keydown.escape)="closePanel()"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen"
      >
        <span class="searchable-select-label" [class.text-on-surface-variant]="!displayLabel">
          {{ displayLabel || placeholder }}
        </span>
        <span class="material-symbols-outlined text-on-surface-variant">expand_more</span>
      </button>
      <div
        class="searchable-select-panel"
        [class.show]="isOpen"
        [ngStyle]="panelStyles"
        role="listbox"
      >
        <div class="p-2 border-bottom border-white/10">
        <input
          #searchInput
          type="text"
          class="form-control searchable-select-search"
          placeholder="Buscar..."
          [disabled]="disabled"
          (input)="filterOptions($event)"
          (click)="$event.stopPropagation()"
          (keydown.escape)="closePanel()"
        />
      </div>
        <div class="searchable-select-options">
          <button
            *ngFor="let option of filteredOptions"
            type="button"
            class="searchable-select-option"
            [class.selected]="option.value === value"
            [disabled]="disabled"
            (click)="selectOption(option)"
            (keydown.enter)="selectOption(option)"
            role="option"
            [attr.aria-selected]="option.value === value"
          >
            {{ option.label }}
          </button>
          <div *ngIf="filteredOptions.length === 0" class="p-3 text-center text-on-surface-variant font-label-sm">
            Sin resultados
          </div>
        </div>
      </div>
      <div class="invalid-feedback" [class.d-none]="!isInvalid" [class.d-block]="isInvalid">
        {{ requiredMessage }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    .searchable-select {
      position: relative;
    }

    .searchable-select-trigger {
      cursor: pointer;
      padding-right: 2.5rem;
      position: relative;
      z-index: 1;
    }

    .searchable-select-trigger.is-invalid {
      border-color: var(--bs-form-invalid-border-color, #dc3545);
    }

    :host(.ng-invalid.ng-touched) .searchable-select-trigger {
      border-color: var(--bs-form-invalid-border-color, #dc3545);
    }

    .searchable-select-trigger .material-symbols-outlined {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      transition: transform 0.2s ease;
    }

    .searchable-select.open .searchable-select-trigger .material-symbols-outlined {
      transform: translateY(-50%) rotate(180deg);
    }

    .searchable-select-panel {
      display: none;
      position: fixed;
      z-index: 2005;
      background: var(--bs-body-bg, #1f1f21);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      max-height: 300px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .searchable-select-panel.show {
      display: flex;
      flex-direction: column;
    }

    .searchable-select-options {
      overflow-y: auto;
      flex: 1;
    }

    .searchable-select-option {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--bs-body-color, #e4e2e4);
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .searchable-select-option:hover,
    .searchable-select-option:focus-visible {
      background: rgba(255, 255, 255, 0.08);
    }

    .searchable-select-option.selected {
      background: rgba(183, 199, 229, 0.15);
      color: var(--bs-primary, #b7c7e5);
      font-weight: 600;
    }

    .searchable-select-trigger:disabled {
      cursor: not-allowed;
      opacity: 0.85;
    }

    .searchable-select-option:disabled {
      cursor: not-allowed;
      opacity: 0.72;
    }

    /* Light mode overrides */
    :host-context(.light) .searchable-select-panel {
      background: #ffffff;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    :host-context(.light) .searchable-select-option {
      color: #1e293b;
    }

    :host-context(.light) .searchable-select-option:hover,
    :host-context(.light) .searchable-select-option:focus-visible {
      background: rgba(0, 0, 0, 0.05);
    }

    :host-context(.light) .searchable-select-option.selected {
      background: rgba(5, 87, 191, 0.1);
      color: #0457bf;
    }
  `]
})
export class Select3Component implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef);

  @Input() placeholder = 'Seleccionar...';
  @Input() requiredMessage = 'Este campo es obligatorio.';
  @Input() disabled = false;

  private _options: Select3Option[] = [];
  @Input() set options(value: Select3Option[]) {
    this._options = value ?? [];
    this.syncDisplayLabel();
  }
  get options(): Select3Option[] {
    return this._options;
  }

  value: number | string | boolean | null = null;
  displayLabel = '';
  isOpen = false;
  isInvalid = false;
  searchQuery = '';
  panelStyles: Record<string, string> = {};

  private onChange: (value: number | string | boolean | null) => void = () => {};
  private onTouched: () => void = () => {};

  get filteredOptions(): Select3Option[] {
    if (!this.searchQuery) {
      return this.options;
    }
    const query = this.searchQuery.toLowerCase();
    return this.options.filter((opt) => opt.label.toLowerCase().includes(query));
  }

  togglePanel(): void {
    if (this.disabled) {
      return;
    }

    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.updatePanelPosition();
      setTimeout(() => {
        const input = this.elementRef.nativeElement.querySelector('.searchable-select-search') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      });
    }
  }

  closePanel(): void {
    this.isOpen = false;
    this.searchQuery = '';
    this.panelStyles = {};
  }

  filterOptions(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  selectOption(option: Select3Option): void {
    if (this.disabled) {
      return;
    }

    this.value = option.value;
    this.displayLabel = option.label;
    this.isOpen = false;
    this.searchQuery = '';
    this.isInvalid = false;
    this.onChange(this.value);
    this.onTouched();
  }

  setInvalid(invalid: boolean): void {
    this.isInvalid = invalid;
  }

  // ControlValueAccessor
  writeValue(value: number | string | boolean | null): void {
    this.value = value;
    this.syncDisplayLabel();
  }

  registerOnChange(fn: (value: number | string | boolean | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.closePanel();
    }
  }

  private syncDisplayLabel(): void {
    const option = this.options.find((opt) => opt.value === this.value);
    this.displayLabel = option?.label ?? '';
  }

  private updatePanelPosition(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const trigger = host.querySelector('.searchable-select-trigger') as HTMLElement | null;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const maxHeight = 300;
    const gap = 4;

    this.panelStyles = {
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: `${rect.bottom + gap}px`,
      maxHeight: `${Math.min(maxHeight, Math.max(180, window.innerHeight - rect.bottom - gap - 12))}px`
    };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closePanel();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.updatePanelPosition();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isOpen) {
      this.updatePanelPosition();
    }
  }
}
