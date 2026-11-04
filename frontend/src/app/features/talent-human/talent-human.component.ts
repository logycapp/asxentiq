import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

interface TalentDetail {
  name: string;
  description: string;
  children?: TalentDetail[];
}

interface TalentSubmodule {
  name: string;
  description: string;
  purpose: string;
  items: TalentDetail[];
  workflow: string[];
  icon: 'organization' | 'training' | 'communication';
  tone: string;
}

@Component({
  selector: 'app-talent-human',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './talent-human.component.html',
  styleUrl: './talent-human.component.css'
})
export class TalentHumanComponent {
  @ViewChild('modalCloseButton') private modalCloseButton?: ElementRef<HTMLButtonElement>;

  selectedSubmodule: TalentSubmodule | null = null;
  private returnFocusTo: HTMLElement | null = null;

  readonly submodules: TalentSubmodule[] = [
    {
      name: 'Gestión organizacional',
      description: 'Organiza los elementos que ayudan a orientar, desarrollar y evaluar el trabajo de las personas en relación con los objetivos de la compañía.',
      purpose: 'Conectar los objetivos de la organización con las capacidades, metas e indicadores que permiten hacer seguimiento al trabajo y al desarrollo del equipo.',
      items: [
        {
          name: 'Indicadores',
          description: 'Métricas para observar el avance y los resultados de los procesos relacionados con talento humano.'
        },
        {
          name: 'Objetivos',
          description: 'Prioridades que orientan el trabajo y que sirven como referencia para definir metas y evaluar avances.',
          children: [
            { name: 'Competencias', description: 'Capacidades y comportamientos que las personas necesitan para contribuir a los objetivos de su rol y de la organización.' },
            { name: 'Metas', description: 'Resultados esperados que permiten concretar los objetivos y revisar su progreso.' },
            { name: 'Evaluación', description: 'Revisión del avance frente a los objetivos, las metas y las competencias definidas.' }
          ]
        }
      ],
      workflow: ['Definir los objetivos organizacionales.', 'Relacionar competencias y metas con los objetivos.', 'Revisar avances e indicadores.', 'Evaluar resultados para orientar acciones de mejora.'],
      icon: 'organization',
      tone: 'blue'
    },
    {
      name: 'Capacitaciones',
      description: 'Agrupa los contenidos de formación que el diagrama relaciona con talento humano, desde la inducción hasta temas de cumplimiento y políticas internas.',
      purpose: 'Facilitar que las personas conozcan la compañía, sus lineamientos y los temas de formación relevantes para su trabajo.',
      items: [
        { name: 'Inducciones', description: 'Contenidos de bienvenida y orientación para que las personas conozcan la compañía, sus procesos y responsabilidades.' },
        { name: 'SARLAFT', description: 'Formación sobre el sistema de administración del riesgo de lavado de activos y financiación del terrorismo, y las responsabilidades asociadas.' },
        { name: 'Políticas de compañía', description: 'Espacio para presentar y reforzar los lineamientos internos que orientan el trabajo y la conducta en la organización.' }
      ],
      workflow: ['Identificar el tema de formación.', 'Organizar el contenido para las personas a quienes va dirigido.', 'Comunicar y desarrollar la capacitación.', 'Reforzar los aprendizajes y lineamientos de la compañía.'],
      icon: 'training',
      tone: 'violet'
    },
    {
      name: 'Comunicaciones',
      description: 'Reúne canales y contenidos para compartir información relevante con las personas de la organización.',
      purpose: 'Mantener a los equipos informados sobre novedades organizacionales y facilitar la difusión de mensajes en formatos audiovisuales.',
      items: [
        { name: 'Novedades organizacionales', description: 'Anuncios y actualizaciones sobre cambios, actividades o información de interés para las personas de la compañía.' },
        { name: 'Video clips', description: 'Piezas audiovisuales breves para explicar, comunicar o reforzar información de manera clara y fácil de consultar.' }
      ],
      workflow: ['Preparar la información o el mensaje.', 'Elegir el canal o formato adecuado.', 'Compartir novedades y contenidos con la organización.'],
      icon: 'communication',
      tone: 'cyan'
    }
  ];

  openSubmodule(item: TalentSubmodule, trigger: HTMLElement): void {
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
