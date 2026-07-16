import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-empresa-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './empresa-list.component.html',
  styleUrls: []
})
export class EmpresaListComponent implements OnInit, OnDestroy {
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);

  empresas: Empresa[] = [];
  filteredEmpresas: Empresa[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchQuery = '';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit(): void {
    this.loadEmpresas();
  }

  ngOnDestroy(): void {
    // No side effects to clean up.
  }

  loadEmpresas(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.empresaService.list())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (empresas) => {
          this.empresas = empresas;
          this.applyFilter();
        },
        error: () => (this.errorMessage = 'No fue posible cargar las empresas.')
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

  toggleStatus(empresa: Empresa): void {
    const action = empresa.active ? 'desactivar' : 'activar';
    const confirmed = window.confirm(`¿Deseas ${action} a ${empresa.name}?`);

    if (!confirmed) {
      return;
    }

    const request = empresa.active
      ? this.empresaService.deactivate(empresa.id)
      : this.empresaService.activate(empresa.id);

    this.loadingService.track(request).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadEmpresas();
      },
      error: () => {
        this.errorMessage = `No fue posible ${action} la empresa.`;
      }
    });
  }

  statusLabel(empresa: Empresa): string {
    return empresa.active ? 'Activa' : 'Inactiva';
  }

  statusBadgeClass(empresa: Empresa): string {
    return empresa.active
      ? 'badge rounded-pill empresa-status-badge empresa-status-active'
      : 'badge rounded-pill empresa-status-badge empresa-status-inactive';
  }

  logoUrl(empresa: Empresa): string {
    return empresa.logo_url || '';
  }

  hasLogo(empresa: Empresa): boolean {
    return Boolean(empresa.logo_url);
  }

  trackById(_: number, empresa: Empresa): number {
    return empresa.id;
  }

  private applyFilter(): void {
    let result = [...this.empresas];

    if (this.searchQuery) {
      result = result.filter((empresa) =>
        empresa.name.toLowerCase().includes(this.searchQuery) ||
        (empresa.tax_id || '').toLowerCase().includes(this.searchQuery) ||
        (empresa.email || '').toLowerCase().includes(this.searchQuery) ||
        (empresa.phone || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.sortKey) {
      result.sort((a, b) => {
        const left = String(this.getSortValue(a, this.sortKey));
        const right = String(this.getSortValue(b, this.sortKey));
        const cmp = left.localeCompare(right);
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredEmpresas = result;
  }

  private getSortValue(empresa: Empresa, key: string): string | number | boolean {
    switch (key) {
      case 'name':
        return empresa.name;
      case 'tax_id':
        return empresa.tax_id ?? '';
      case 'address':
        return empresa.address ?? '';
      case 'phone':
        return empresa.phone ?? '';
      case 'email':
        return empresa.email ?? '';
      case 'active':
        return empresa.active;
      case 'id':
        return empresa.id;
      default:
        return '';
    }
  }
}
