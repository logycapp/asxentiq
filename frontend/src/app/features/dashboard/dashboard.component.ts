import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly stats = [
    { label: 'Usuarios activos', value: '128', detail: '+12 este mes' },
    { label: 'Solicitudes API', value: '4.8k', detail: 'Ultimas 24 horas' },
    { label: 'Tasa de respuesta', value: '99.2%', detail: 'Backend estable' },
    { label: 'Tareas abiertas', value: '18', detail: 'Pendientes de revision' }
  ];

  readonly steps = [
    'Autenticacion con Sanctum conectada',
    'CRUD de usuarios listo para extender',
    'Base visual limpia sin plantilla heredada'
  ];

  get userName(): string {
    return this.authService.getCurrentUser()?.name ?? 'Usuario';
  }
}
