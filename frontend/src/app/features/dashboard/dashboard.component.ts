import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

interface DashboardModule {
  name: string;
  description: string;
  highlights: string[];
  icon: 'people' | 'shield' | 'risk';
  tone: 'people' | 'sst' | 'sarlaft';
  route?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly modules: DashboardModule[] = [
    {
      name: 'Talento humano',
      description: 'Organiza la gestión de personas y acompaña el desarrollo de cada equipo.',
      highlights: ['Objetivos', 'Competencias', 'Metas', 'Evaluación', 'Comunicaciones'],
      icon: 'people',
      tone: 'people',
      route: '/talento-humano'
    },
    {
      name: 'SST',
      description: 'Fortalece la seguridad y salud en el trabajo con seguimiento y prevención.',
      highlights: ['Indicadores', 'Capacitaciones', 'Requisitos legales', 'Prevención'],
      icon: 'shield',
      tone: 'sst',
      route: '/sst'
    },
    {
      name: 'SARLAFT',
      description: 'Consulta los indicadores de SARLAFT en vistas gerenciales y operativas.',
      highlights: ['Indicadores', 'Tableros gerenciales', 'Tableros operativos'],
      icon: 'risk',
      tone: 'sarlaft',
      route: '/sarlaft'
    }
  ];
}
