import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

interface SarlaftDetail {
  name: string;
  description: string;
}

interface SarlaftSubmodule {
  name: string;
  description: string;
  purpose: string;
  items: SarlaftDetail[];
  workflow: string[];
}

@Component({
  selector: 'app-sarlaft',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './sarlaft.component.html',
  styleUrl: './sarlaft.component.css'
})
export class SarlaftComponent {
  @ViewChild('modalCloseButton') private modalCloseButton?: ElementRef<HTMLButtonElement>;

  selectedSubmodule: SarlaftSubmodule | null = null;
  private returnFocusTo: HTMLElement | null = null;

  readonly submodules: SarlaftSubmodule[] = [
    {
      name: 'Indicadores',
      description: 'Espacio de seguimiento que organiza la información del sistema en dos vistas: gerencial y operativa.',
      purpose: 'Facilitar la revisión de indicadores de SARLAFT desde una vista de gestión general y otra enfocada en el seguimiento de las actividades operativas.',
      items: [
        {
          name: 'Tableros gerenciales',
          description: 'Vista consolidada para que la dirección consulte información relevante del sistema, observe tendencias y apoye la toma de decisiones.'
        },
        {
          name: 'Tableros operativos',
          description: 'Vista orientada al seguimiento de actividades y registros operativos relacionados con SARLAFT.'
        }
      ],
      workflow: [
        'Consultar la vista gerencial para obtener una lectura general de los indicadores.',
        'Revisar la vista operativa para profundizar en el seguimiento de actividades.',
        'Identificar variaciones o asuntos que requieren revisión.',
        'Usar los hallazgos como insumo para el análisis y la gestión del sistema.'
      ]
    }
  ];

  openSubmodule(item: SarlaftSubmodule, trigger: HTMLElement): void {
    this.returnFocusTo = trigger;
    this.selectedSubmodule = item;
    window.setTimeout(() => this.modalCloseButton?.nativeElement.focus(), 0);
  }

  closeModal(): void {
    this.selectedSubmodule = null;
    this.returnFocusTo?.focus();
    this.returnFocusTo = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedSubmodule) {
      this.closeModal();
    }
  }
}
