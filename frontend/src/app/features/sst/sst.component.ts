import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

interface SstDetail {
  name: string;
  description: string;
}

interface SstSubmodule {
  name: string;
  description: string;
  purpose: string;
  items: SstDetail[];
  workflow: string[];
  icon: 'indicators' | 'training' | 'monitoring' | 'infographic';
  tone: 'blue' | 'violet' | 'cyan' | 'green';
}

@Component({
  selector: 'app-sst',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './sst.component.html',
  styleUrl: './sst.component.css'
})
export class SstComponent {
  @ViewChild('modalCloseButton') private modalCloseButton?: ElementRef<HTMLButtonElement>;

  selectedSubmodule: SstSubmodule | null = null;
  private returnFocusTo: HTMLElement | null = null;

  readonly submodules: SstSubmodule[] = [
    {
      name: 'Indicadores',
      description: 'Reúne los tableros de seguimiento de requisitos y estándares del Sistema de Gestión de Seguridad y Salud en el Trabajo.',
      purpose: 'Facilitar la consulta del avance del SG-SST frente a los referentes normativos que aparecen en el diagrama.',
      items: [
        { name: 'Tablero de seguimiento — Resolución 0312', description: 'Da seguimiento a los estándares mínimos del SG-SST establecidos en la Resolución 0312 y permite consultar su estado.' },
        { name: 'Tablero de seguimiento — Decreto 1072', description: 'Organiza el seguimiento de los requisitos del SG-SST asociados al Decreto 1072 de 2015.' }
      ],
      workflow: ['Seleccionar el referente normativo que se desea consultar.', 'Revisar los requisitos o estándares incluidos en el seguimiento.', 'Identificar avances y aspectos que requieren atención.', 'Usar los resultados como apoyo a la revisión y mejora del SG-SST.'],
      icon: 'indicators',
      tone: 'blue'
    },
    {
      name: 'Capacitaciones',
      description: 'Agrupa las jornadas de formación en SST y los temas específicos que aparecen en el diagrama del proyecto.',
      purpose: 'Fortalecer el conocimiento y la participación de las personas en prevención, convivencia, cumplimiento y prácticas seguras de trabajo.',
      items: [
        { name: 'COPAST', description: 'Tema de formación relacionado con el comité indicado en el diagrama como COPAST.' },
        { name: 'Comité de convivencia', description: 'Orientación sobre el comité y su papel en la convivencia laboral.' },
        { name: 'Identificación y gestión de riesgos', description: 'Reconocimiento de peligros y participación en la identificación, valoración y gestión de riesgos.' },
        { name: 'Estándares mínimos', description: 'Formación sobre los estándares mínimos aplicables al Sistema de Gestión de SST.' },
        { name: 'Actualización de matriz legal', description: 'Revisión y divulgación de cambios en los requisitos legales relacionados con SST.' },
        { name: 'Salud mental', description: 'Sensibilización y promoción del cuidado de la salud mental en el entorno laboral.' },
        { name: 'Uso adecuado de EPP', description: 'Orientación para seleccionar, utilizar y cuidar correctamente los elementos de protección personal.' }
      ],
      workflow: ['Definir el tema de formación según las necesidades de SST.', 'Preparar y comunicar el contenido a las personas participantes.', 'Desarrollar la capacitación y reforzar las prácticas preventivas.', 'Dar seguimiento a las necesidades de actualización y sensibilización.'],
      icon: 'training',
      tone: 'violet'
    },
    {
      name: 'Bot monitoreo normatividad',
      description: 'Componente planteado para apoyar el monitoreo de novedades normativas relacionadas con seguridad y salud en el trabajo.',
      purpose: 'Ayudar a identificar actualizaciones normativas de SST y llevarlas a revisión para determinar su relevancia para la organización.',
      items: [
        { name: 'Actualización normativa de SST', description: 'Tema señalado en el diagrama como resultado del monitoreo normativo.' }
      ],
      workflow: ['Detectar una posible novedad normativa.', 'Revisar y validar la información identificada.', 'Determinar si aplica a los procesos de SST de la organización.', 'Comunicar la actualización y considerar si requiere ajustar documentos o prácticas.'],
      icon: 'monitoring',
      tone: 'cyan'
    },
    {
      name: 'Infografías SST',
      description: 'Recurso visual para presentar información de SST de forma breve y fácil de compartir.',
      purpose: 'Apoyar la comunicación y sensibilización sobre temas de prevención y seguridad en el trabajo.',
      items: [
        { name: 'Piezas de comunicación visual', description: 'El diagrama menciona infografías SST, pero no detalla títulos o contenidos específicos para este apartado.' }
      ],
      workflow: ['Seleccionar el tema de SST que se quiere comunicar.', 'Preparar un mensaje visual claro y breve.', 'Compartir la pieza como apoyo a la comunicación o capacitación.'],
      icon: 'infographic',
      tone: 'green'
    }
  ];

  openSubmodule(item: SstSubmodule, trigger: HTMLElement): void {
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
