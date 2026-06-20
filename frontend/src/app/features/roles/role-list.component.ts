import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { Role, RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbAlertModule],
  templateUrl: './role-list.component.html'
})
export class RoleListComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly loadingService = inject(LoadingService);

  roles: Role[] = [];
  loading = false;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.roleService.list())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (roles) => (this.roles = roles),
        error: () => (this.errorMessage = 'No fue posible cargar los roles.')
      });
  }

  remove(role: Role): void {
    const confirmed = window.confirm(`Eliminar el rol ${role.name}?`);

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.roleService.delete(role.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadRoles();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No fue posible eliminar el rol.';
      }
    });
  }
}
