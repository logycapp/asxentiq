import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  readonly services = [
    {
      icon: 'fa-solid fa-graduation-cap',
      title: 'Formaciones Especializadas',
      description: 'Capacitacion adaptada a las necesidades reales de su industria.',
      items: ['Modalidad virtual y presencial', 'Entrenamiento hands-on', 'Certificacion inmediata']
    },
    {
      icon: 'fa-solid fa-clipboard-check',
      title: 'Auditorias SST',
      description: 'Evaluacion rigurosa para garantizar la seguridad legal y operativa.',
      items: ['Blindaje 360°', 'Cumplimiento normativo estricto', 'Planes de mejora continua']
    },
    {
      icon: 'fa-solid fa-network-wired',
      title: 'Ecosistema Tecnologico',
      description: 'Plataformas digitales para la gestion inteligente de la seguridad.',
      items: ['Plataforma eLearning integrada', 'Data analytics predictivo', 'Asistencia AI en tiempo real']
    }
  ];

  readonly methodology = [
    {
      number: '1',
      title: 'Diagnostico',
      description: 'Evaluacion inicial de brechas y riesgos actuales.'
    },
    {
      number: '2',
      title: 'Diseno',
      description: 'Estructuracion de la estrategia digital y operativa.'
    },
    {
      number: '3',
      title: 'Implementacion',
      description: 'Despliegue tecnologico y formacion en campo.'
    },
    {
      number: '4',
      title: 'Seguimiento',
      description: 'Monitoreo continuo y auditorias periodicas.'
    }
  ];

  readonly roiRows = [
    {
      icon: 'fa-solid fa-scale-balanced',
      label: 'Cumplimiento Normativo',
      solution: 'Auditoria Garantia 1072',
      impact: 'Evita multas y sanciones legales'
    },
    {
      icon: 'fa-solid fa-arrow-trend-down',
      label: 'Reduccion de Accidentalidad',
      solution: 'Planes de Intervencion en Campo',
      impact: 'Disminuye primas de ARL'
    },
    {
      icon: 'fa-solid fa-gauge-high',
      label: 'Eficiencia Operativa',
      solution: 'Plataforma Ecosistema Tecnologico',
      impact: 'Ahorro del 30% en horas administrativas'
    }
  ];
}
