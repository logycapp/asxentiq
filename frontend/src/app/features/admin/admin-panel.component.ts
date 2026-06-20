import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { RoleMenuItem, RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbAlertModule],
  templateUrl: './admin-panel.component.html'
})
export class AdminPanelComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly roleService = inject(RoleService);

  loading = false;
  errorMessage = '';
  roleId: number | null = null;
  roleName = 'No determinado';
  usersItem: RoleMenuItem | null = null;
  rolesItem: RoleMenuItem | null = null;

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.roleId = currentUser?.role_relation?.id ?? null;
    this.roleName = currentUser?.role_relation?.name ?? 'No determinado';

    if (this.roleId) {
      this.loadPermissions(this.roleId);
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.errorMessage = 'No fue posible determinar el rol actual.';
      return;
    }

    this.authService.me().subscribe({
      next: (response) => {
        const role = response.user.role_relation;
        this.roleId = role?.id ?? null;
        this.roleName = role?.name ?? 'No determinado';

        if (!this.roleId) {
          this.errorMessage = 'No fue posible determinar el rol actual.';
          return;
        }

        this.loadPermissions(this.roleId);
      },
      error: () => {
        this.errorMessage = 'No fue posible determinar el rol actual.';
      }
    });
  }

  get canShowUserAccess(): boolean {
    return Boolean(this.usersItem?.assigned_to_role);
  }

  get canShowRoleAccess(): boolean {
    return Boolean(this.rolesItem?.assigned_to_role);
  }

  loadPermissions(roleId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.roleService.menuPermissions(roleId))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.usersItem = response.menu_items.find((item) => item.route === '/users') ?? null;
          this.rolesItem = response.menu_items.find((item) => item.route === '/roles') ?? null;
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los permisos del rol actual.';
        }
      });
  }
}
