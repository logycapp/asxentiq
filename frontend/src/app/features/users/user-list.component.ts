import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Tooltip } from 'bootstrap';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { LoadingService } from '../../core/services/loading.service';
import { Role, RoleService } from '../../core/services/role.service';
import { User, UserPayload, UserMenuPermissionItem, UserService } from '../../core/services/user.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private tooltipInstances = new Map<HTMLElement, { dispose: () => void }>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

  users: User[] = [];
  filteredUsers: User[] = [];
  empresas: Empresa[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchQuery = '';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  empresaId: number | null = null;

  // Modal state (edit)
  editingUser: User | null = null;
  editName = '';
  editEmail = '';
  editRole = 'user';
  editEmpresaId: number | null = null;
  editActive = true;
  editPassword = '';
  editPasswordConfirmation = '';
  saving = false;
  roles: Role[] = [];

  // Modal state (create)
  creating = false;
  createName = '';
  createEmail = '';
  createRole = 'user';
  createEmpresaId: number | null = null;
  createActive = true;
  createPassword = '';
  createPasswordConfirmation = '';
  createSaving = false;
  createErrorMessage = '';

  ngOnInit(): void {
    const routeEmpresaId = Number(this.route.snapshot.paramMap.get('empresaId'));
    this.empresaId = Number.isFinite(routeEmpresaId) && routeEmpresaId > 0 ? routeEmpresaId : null;
    this.loadEmpresas();
    this.loadUsers();
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    this.refreshTooltips();
  }

  ngOnDestroy(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
      this.tooltipRefreshTimer = null;
    }
    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.userService.list(this.empresaId ? { empresa_id: this.empresaId } : undefined))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.applyFilter();
          this.scheduleTooltipRefresh();
        },
        error: () => (this.errorMessage = 'No fue posible cargar los usuarios.')
      });
  }

  private loadRoles(): void {
    this.roleService.list().subscribe({
      next: (roles) => (this.roles = roles)
    });
  }

  private loadEmpresas(): void {
    this.empresaService.list().subscribe({
      next: (empresas) => {
        this.empresas = empresas;

        if (this.creating && !this.createEmpresaId) {
          this.createEmpresaId = this.empresaId ?? this.empresas[0]?.id ?? null;
        }
      }
    });
  }

  openEditModal(user: User): void {
    this.editingUser = user;
    this.editName = user.name;
    this.editEmail = user.email;
    this.editRole = user.role || 'user';
    this.editEmpresaId = user.empresa_id ?? null;
    this.editActive = user.active;
    this.editPassword = '';
    this.editPasswordConfirmation = '';
    this.errorMessage = '';
    this.saving = false;
  }

  closeEditModal(): void {
    this.editingUser = null;
  }

  saveEdit(): void {
    if (!this.editingUser || !this.editName || !this.editEmail) return;

    if (this.editPassword && this.editPassword.length < 8) {
      this.errorMessage = 'La contrasena debe tener al menos 8 caracteres.';
      return;
    }

    if (this.editPassword !== this.editPasswordConfirmation) {
      this.errorMessage = 'Las contrasenas no coinciden.';
      return;
    }

    if (!this.editEmpresaId) {
      this.errorMessage = 'Debes seleccionar una empresa.';
      return;
    }

    const payload: UserPayload = {
      name: this.editName,
      email: this.editEmail,
      active: this.editActive,
      role: this.editRole,
      empresa_id: this.editEmpresaId,
    };

    if (this.editPassword) {
      payload.password = this.editPassword;
      payload.password_confirmation = this.editPasswordConfirmation;
    }

    this.saving = true;
    this.errorMessage = '';

    this.loadingService.track(this.userService.update(this.editingUser.id, payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.closeEditModal();
          this.loadUsers();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No fue posible guardar.';
        }
      });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase().trim();
    this.applyFilter();
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.applyFilter();
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) return 'unfold_more';
    return this.sortDirection === 'asc' ? 'north' : 'south';
  }

  private applyFilter(): void {
    let result = this.users;

    if (this.searchQuery) {
      result = result.filter((u) =>
        u.name.toLowerCase().includes(this.searchQuery) ||
        u.email.toLowerCase().includes(this.searchQuery) ||
        (u.role || '').toLowerCase().includes(this.searchQuery) ||
        (u.empresa_relation?.name || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.sortKey === 'name') {
      result.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    if (this.sortKey === 'empresa') {
      result.sort((a, b) => {
        const cmp = (a.empresa_relation?.name ?? '').localeCompare(b.empresa_relation?.name ?? '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredUsers = result;
    this.scheduleTooltipRefresh();
  }

  activate(user: User): void {
    this.loadingService.track(this.userService.activate(user.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadUsers();
      }
    });
  }

  deactivate(user: User): void {
    this.loadingService.track(this.userService.deactivate(user.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadUsers();
      }
    });
  }

  remove(user: User): void {
    const confirmed = window.confirm(`Eliminar a ${user.name}?`);

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.userService.delete(user.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadUsers();
      }
    });
  }

  // ── Menu permissions modal ──

  permUser: User | null = null;
  permMenuItems: UserMenuPermissionItem[] = [];
  permSelectedIds = new Set<number>();
  permLoading = false;
  permSaving = false;
  permErrorMessage = '';
  permMessage = '';

  openPermModal(user: User): void {
    this.permUser = user;
    this.permMenuItems = [];
    this.permSelectedIds = new Set();
    this.permLoading = true;
    this.permErrorMessage = '';
    this.permMessage = '';

    this.loadingService
      .track(this.userService.menuPermissions(user.id))
      .pipe(finalize(() => (this.permLoading = false)))
      .subscribe({
        next: (response) => {
          this.permMenuItems = response.menu_items;
          this.permSelectedIds = new Set(
            response.menu_items.filter((item) => item.assigned_to_user).map((item) => item.id)
          );
        },
        error: () => {
          this.permErrorMessage = 'No fue posible cargar los permisos del usuario.';
        }
      });
  }

  closePermModal(): void {
    this.permUser = null;
  }

  togglePermItem(item: UserMenuPermissionItem, checked: boolean): void {
    const next = new Set(this.permSelectedIds);
    if (checked) {
      next.add(item.id);
    } else {
      next.delete(item.id);
    }
    this.permSelectedIds = next;
  }

  onPermToggleChange(item: UserMenuPermissionItem, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.togglePermItem(item, Boolean(target?.checked));
  }

  isPermChecked(item: UserMenuPermissionItem): boolean {
    return this.permSelectedIds.has(item.id);
  }

  permStatusLabel(item: UserMenuPermissionItem): string {
    if (item.assigned_to_role && item.assigned_to_user) return 'Rol + directo';
    if (item.assigned_to_role) return 'Por rol';
    if (item.assigned_to_user) return 'Especial';
    return 'Sin asignar';
  }

  permStatusClass(item: UserMenuPermissionItem): string {
    if (item.assigned_to_role && item.assigned_to_user) return 'text-bg-primary';
    if (item.assigned_to_role) return 'text-bg-info';
    if (item.assigned_to_user) return 'text-bg-success';
    return 'text-bg-danger';
  }

  savePerm(): void {
    if (!this.permUser) return;

    this.permSaving = true;
    this.permErrorMessage = '';
    this.permMessage = '';

    this.loadingService
      .track(this.userService.updateMenuPermissions(this.permUser.id, Array.from(this.permSelectedIds)))
      .pipe(finalize(() => (this.permSaving = false)))
      .subscribe({
        next: (response) => {
          this.permMessage = response.message;
          this.openPermModal(this.permUser!);
        },
        error: () => {
          this.permErrorMessage = 'No fue posible actualizar los permisos del usuario.';
        }
      });
  }

  permTrackById(_: number, item: UserMenuPermissionItem): number {
    return item.id;
  }

  get permInheritedItems(): UserMenuPermissionItem[] {
    return this.permMenuItems.filter((item) => item.assigned_to_role);
  }

  // ── Create modal ──

  openCreateModal(): void {
    this.creating = true;
    this.createName = '';
    this.createEmail = '';
    this.createRole = this.roles[0]?.slug ?? 'user';
    this.createEmpresaId = this.empresaId ?? this.empresas[0]?.id ?? null;
    this.createActive = true;
    this.createPassword = '';
    this.createPasswordConfirmation = '';
    this.createErrorMessage = '';
    this.createSaving = false;
  }

  closeCreateModal(): void {
    this.creating = false;
  }

  saveCreate(): void {
    if (!this.createName || !this.createEmail) return;

    if (!this.createPassword || this.createPassword.length < 8) {
      this.createErrorMessage = 'La contrasena debe tener al menos 8 caracteres.';
      return;
    }

    if (this.createPassword !== this.createPasswordConfirmation) {
      this.createErrorMessage = 'Las contrasenas no coinciden.';
      return;
    }

    if (!this.createEmpresaId) {
      this.createErrorMessage = 'Debes seleccionar una empresa.';
      return;
    }

    const payload: UserPayload = {
      name: this.createName,
      email: this.createEmail,
      active: this.createActive,
      role: this.createRole,
      empresa_id: this.createEmpresaId,
      password: this.createPassword,
      password_confirmation: this.createPasswordConfirmation,
    };

    this.createSaving = true;
    this.createErrorMessage = '';

    this.loadingService.track(this.userService.create(payload))
      .pipe(finalize(() => (this.createSaving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.closeCreateModal();
          this.loadUsers();
        },
        error: (error) => {
          this.createErrorMessage = error?.error?.message || 'No fue posible crear el usuario.';
        }
      });
  }

  private refreshTooltips(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();

    document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]').forEach((element) => {
      const tooltip = new Tooltip(element, {
        trigger: 'hover focus',
        placement: element.getAttribute('data-bs-placement') || 'top',
        container: 'body'
      });

      this.tooltipInstances.set(element, tooltip);
    });
  }

  private scheduleTooltipRefresh(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
    }

    this.tooltipRefreshTimer = window.setTimeout(() => {
      this.tooltipRefreshTimer = null;
      this.refreshTooltips();
    }, 0);
  }
}
