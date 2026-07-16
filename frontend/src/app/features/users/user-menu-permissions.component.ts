import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { UserMenuPermissionItem, UserMenuPermissionsResponse, UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-menu-permissions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-menu-permissions.component.html'
})
export class UserMenuPermissionsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);

  user: UserMenuPermissionsResponse['user'] | null = null;
  menuItems: UserMenuPermissionItem[] = [];
  selectedIds = new Set<number>();
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPermissions(id);
  }

  get inheritedItems(): UserMenuPermissionItem[] {
    return this.menuItems.filter((item) => item.assigned_to_role);
  }

  get directItems(): UserMenuPermissionItem[] {
    return this.menuItems;
  }

  loadPermissions(userId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.userService.menuPermissions(userId))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.user = response.user;
          this.menuItems = response.menu_items;
          this.selectedIds = new Set(
            response.menu_items.filter((item) => item.assigned_to_user).map((item) => item.id)
          );
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los permisos del usuario.';
        }
      });
  }

  toggleItem(item: UserMenuPermissionItem, checked: boolean): void {
    const next = new Set(this.selectedIds);

    if (checked) {
      next.add(item.id);
    } else {
      next.delete(item.id);
    }

    this.selectedIds = next;
  }

  onToggleChange(item: UserMenuPermissionItem, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.toggleItem(item, Boolean(target?.checked));
  }

  isChecked(item: UserMenuPermissionItem): boolean {
    return this.selectedIds.has(item.id);
  }

  statusLabel(item: UserMenuPermissionItem): string {
    if (item.assigned_to_role && item.assigned_to_user) {
      return 'Rol + directo';
    }

    if (item.assigned_to_role) {
      return 'Por rol';
    }

    if (item.assigned_to_user) {
      return 'Especial';
    }

    return 'Sin asignar';
  }

  statusClass(item: UserMenuPermissionItem): string {
    if (item.assigned_to_role && item.assigned_to_user) {
      return 'text-bg-primary';
    }

    if (item.assigned_to_role) {
      return 'text-bg-info';
    }

    if (item.assigned_to_user) {
      return 'text-bg-success';
    }

    return 'text-bg-danger';
  }

  save(): void {
    if (!this.user) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.loadingService
      .track(this.userService.updateMenuPermissions(this.user.id, Array.from(this.selectedIds)))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.loadPermissions(this.user!.id);
        },
        error: () => {
          this.errorMessage = 'No fue posible actualizar los permisos del usuario.';
        }
      });
  }

  trackById(_: number, item: UserMenuPermissionItem): number {
    return item.id;
  }
}
