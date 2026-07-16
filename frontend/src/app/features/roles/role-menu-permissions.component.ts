import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Role, RoleMenuItem, RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-role-menu-permissions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './role-menu-permissions.component.html'
})
export class RoleMenuPermissionsComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);

  role: Role | null = null;
  menuItems: RoleMenuItem[] = [];
  selectedIds = new Set<number>();
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPermissions(id);
  }

  loadPermissions(roleId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.roleService.menuPermissions(roleId))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.role = response.role;
          this.menuItems = response.menu_items;
          this.selectedIds = new Set(
            response.menu_items.filter((item) => item.assigned_to_role).map((item) => item.id)
          );
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los permisos del menu.';
        }
      });
  }

  toggleItem(item: RoleMenuItem, checked: boolean): void {
    const next = new Set(this.selectedIds);

    if (checked) {
      next.add(item.id);
    } else {
      next.delete(item.id);
    }

    this.selectedIds = next;
  }

  onToggleChange(item: RoleMenuItem, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.toggleItem(item, Boolean(target?.checked));
  }

  isChecked(item: RoleMenuItem): boolean {
    return this.selectedIds.has(item.id);
  }

  assignedRolesLabel(item: RoleMenuItem): string {
    return item.assigned_roles.map((assignedRole) => assignedRole.name).join(', ');
  }

  save(): void {
    if (!this.role) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.loadingService
      .track(this.roleService.updateMenuPermissions(this.role.id, Array.from(this.selectedIds)))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.loadPermissions(this.role!.id);
        },
        error: () => {
          this.errorMessage = 'No fue posible actualizar los permisos del menu.';
        }
      });
  }

  trackById(_: number, item: RoleMenuItem): number {
    return item.id;
  }
}
