import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { Role, RolePayload, RoleService } from '../../core/services/role.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css']
})
export class RoleListComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly loadingService = inject(LoadingService);

  roles: Role[] = [];
  filteredRoles: Role[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchQuery = '';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal state
  editingRole: Role | null = null;
  editName = '';
  editSlug = '';
  editDescription = '';
  editIsSystem = false;
  saving = false;

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
        next: (roles) => {
          this.roles = roles;
          this.applyFilter();
        },
        error: () => (this.errorMessage = 'No fue posible cargar los roles.')
      });
  }

  openEditModal(role: Role): void {
    this.editingRole = role;
    this.editName = role.name;
    this.editSlug = role.slug;
    this.editDescription = role.description || '';
    this.editIsSystem = role.is_system;
    this.errorMessage = '';
    this.saving = false;
  }

  closeEditModal(): void {
    this.editingRole = null;
  }

  saveEdit(): void {
    if (!this.editingRole || !this.editName) return;

    const payload: RolePayload = {
      name: this.editName,
      slug: this.editSlug || undefined,
      description: this.editDescription || null,
      is_system: this.editIsSystem,
    };

    this.saving = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.roleService.update(this.editingRole.id, payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.closeEditModal();
          this.loadRoles();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No fue posible guardar el rol.';
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
    let result = this.roles;

    if (this.searchQuery) {
      result = result.filter((r) =>
        r.name.toLowerCase().includes(this.searchQuery) ||
        r.slug.toLowerCase().includes(this.searchQuery) ||
        (r.description || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.sortKey === 'name') {
      result.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    if (this.sortKey === 'slug') {
      result.sort((a, b) => {
        const cmp = a.slug.localeCompare(b.slug);
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredRoles = result;
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
