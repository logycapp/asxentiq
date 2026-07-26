import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Tooltip } from 'bootstrap';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-empresa-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent],
  templateUrl: './empresa-list.component.html',
  styleUrls: [],
  styles: [`
    :host {
      display: block;
    }

    :host .empresa-status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 4.75rem;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    :host .empresa-status-active {
      background: rgba(34, 197, 94, 0.14);
      border-color: rgba(34, 197, 94, 0.32);
      color: #15803d;
    }

    :host .empresa-status-inactive {
      background: rgba(239, 68, 68, 0.14);
      border-color: rgba(239, 68, 68, 0.32);
      color: #b91c1c;
    }

    :host-context(.light) .empresa-status-active {
      background: rgba(34, 197, 94, 0.14);
      border-color: rgba(34, 197, 94, 0.28);
      color: #166534;
    }

    :host-context(.light) .empresa-status-inactive {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.28);
      color: #b91c1c;
    }
  `]
})
export class EmpresaListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private tooltipInstances = new Map<HTMLElement, Tooltip>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

  empresas: Empresa[] = [];
  filteredEmpresas: Empresa[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchQuery = '';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  page = 1;
  pageSize = 10;
  empresaModalMode: 'create' | 'edit' | null = null;
  empresaModalLoading = false;
  empresaModalSaving = false;
  empresaModalErrorMessage = '';
  editingEmpresaId: number | null = null;
  currentLogoUrl = '';
  selectedLogo: File | null = null;
  previewLogoUrl = '';

  readonly empresaForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    tax_id: [''],
    address: [''],
    phone: [''],
    email: [''],
    active: [true, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadEmpresas();
    this.syncModalWithRoute();
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
    this.clearPreviewLogo();
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
          this.openPendingModalIfNeeded();
          this.scheduleTooltipRefresh();
        },
        error: () => (this.errorMessage = 'No fue posible cargar las empresas.')
      });
  }

  openCreateModal(): void {
    this.empresaModalMode = 'create';
    this.editingEmpresaId = null;
    this.empresaModalErrorMessage = '';
    this.empresaModalSaving = false;
    this.empresaModalLoading = false;
    this.currentLogoUrl = '';
    this.selectedLogo = null;
    this.clearPreviewLogo();
    this.empresaForm.reset({
      name: '',
      tax_id: '',
      address: '',
      phone: '',
      email: '',
      active: true
    });
  }

  openEditModal(empresa: Empresa): void {
    this.empresaModalMode = 'edit';
    this.editingEmpresaId = empresa.id;
    this.empresaModalErrorMessage = '';
    this.empresaModalSaving = false;
    this.empresaModalLoading = false;
    this.currentLogoUrl = empresa.logo_url ?? '';
    this.selectedLogo = null;
    this.clearPreviewLogo();
    this.empresaForm.reset({
      name: empresa.name,
      tax_id: empresa.tax_id ?? '',
      address: empresa.address ?? '',
      phone: empresa.phone ?? '',
      email: empresa.email ?? '',
      active: empresa.active
    });
  }

  closeEmpresaModal(navigateBack = true): void {
    if (this.empresaModalSaving) {
      return;
    }

    this.empresaModalMode = null;
    this.editingEmpresaId = null;
    this.empresaModalErrorMessage = '';
    this.empresaModalLoading = false;
    this.empresaModalSaving = false;
    this.selectedLogo = null;
    this.currentLogoUrl = '';
    this.clearPreviewLogo();
    this.empresaForm.reset({
      name: '',
      tax_id: '',
      address: '',
      phone: '',
      email: '',
      active: true
    });

    if (navigateBack && this.isRouteDrivenEmpresaModal()) {
      void this.router.navigate(['/empresas']);
    }
  }

  saveEmpresaModal(): void {
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    if (this.empresaModalMode === 'edit' && !this.editingEmpresaId) {
      this.empresaModalErrorMessage = 'No fue posible determinar la empresa a editar.';
      return;
    }

    const payload = this.buildPayload();
    const request = this.empresaModalMode === 'edit'
      ? this.empresaService.update(this.editingEmpresaId as number, payload)
      : this.empresaService.create(payload);

    this.empresaModalSaving = true;
    this.empresaModalErrorMessage = '';

    this.loadingService.track(request)
      .pipe(finalize(() => (this.empresaModalSaving = false)))
      .subscribe({
      next: (response) => {
        this.message = response.message;
        const shouldNavigateBack = this.isRouteDrivenEmpresaModal();
        this.empresaModalSaving = false;
        this.closeEmpresaModal(false);

        if (shouldNavigateBack) {
          void this.router.navigate(['/empresas']).then(() => this.loadEmpresas());
          return;
        }

        this.loadEmpresas();
      },
        error: (error) => {
          this.empresaModalErrorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar la empresa.';
        }
      });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedLogo = file;
    this.clearPreviewLogo();

    if (file) {
      this.previewLogoUrl = URL.createObjectURL(file);
    }
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase().trim();
    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) return 'unfold_more';
    return this.sortDirection === 'asc' ? 'north' : 'south';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmpresas.length / this.pageSize));
  }

  get paginatedEmpresas(): Empresa[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredEmpresas.slice(start, start + this.pageSize);
  }

  get startRecord(): number {
    return this.filteredEmpresas.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredEmpresas.length);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
      this.scheduleTooltipRefresh();
    }
  }

  private refreshTooltips(): void {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]'));
    const activeElements = new Set(elements);

    this.tooltipInstances.forEach((tooltip, element) => {
      if (!activeElements.has(element)) {
        tooltip.dispose();
        this.tooltipInstances.delete(element);
      }
    });

    elements.forEach((element) => {
      if (this.tooltipInstances.has(element)) {
        return;
      }

      this.tooltipInstances.set(element, new Tooltip(element));
    });
  }

  private scheduleTooltipRefresh(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
    }

    this.tooltipRefreshTimer = window.setTimeout(() => {
      this.tooltipRefreshTimer = null;
      this.refreshTooltips();
    });
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
    return empresa.active ? 'Activo' : 'Inactivo';
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

  get displayLogoUrl(): string {
    return this.previewLogoUrl || this.currentLogoUrl;
  }

  get isEmpresaEditMode(): boolean {
    return this.empresaModalMode === 'edit';
  }

  get empresaModalTitle(): string {
    return this.isEmpresaEditMode ? 'Editar empresa' : 'Crear empresa';
  }

  get empresaModalSubtitle(): string {
    return this.isEmpresaEditMode
      ? 'Actualiza los datos de la empresa seleccionada.'
      : 'Registra una nueva empresa en el sistema.';
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
    this.page = 1;
  }

  private getSortValue(empresa: Empresa, key: string): string | number | boolean {
    switch (key) {
      case 'name':
        return empresa.name.toLowerCase();
      case 'tax_id':
        return (empresa.tax_id ?? '').toLowerCase();
      case 'address':
        return (empresa.address ?? '').toLowerCase();
      case 'phone':
        return (empresa.phone ?? '').toLowerCase();
      case 'email':
        return (empresa.email ?? '').toLowerCase();
      case 'active':
        return empresa.active ? '1' : '0';
      case 'id':
        return String(empresa.id).padStart(6, '0');
      default:
        return '';
    }
  }

  private buildPayload(): FormData {
    const raw = this.empresaForm.getRawValue();

    const payload = new FormData();
    payload.append('name', raw.name ?? '');
    payload.append('tax_id', raw.tax_id?.trim() || '');
    payload.append('address', raw.address?.trim() || '');
    payload.append('phone', raw.phone?.trim() || '');
    payload.append('email', raw.email?.trim() || '');
    payload.append('active', Boolean(raw.active) ? '1' : '0');

    if (this.selectedLogo) {
      payload.append('logo', this.selectedLogo);
    }

    return payload;
  }

  private clearPreviewLogo(): void {
    if (this.previewLogoUrl) {
      URL.revokeObjectURL(this.previewLogoUrl);
      this.previewLogoUrl = '';
    }
  }

  private syncModalWithRoute(): void {
    const currentUrl = this.router.url.split('?')[0].replace(/\/$/, '');

    if (currentUrl.endsWith('/empresas/create')) {
      this.openCreateModal();
      return;
    }

    if (currentUrl.includes('/empresas/') && currentUrl.endsWith('/edit')) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (Number.isFinite(id) && id > 0) {
        this.openPendingEditModal(id);
      }
    }
  }

  private openPendingModalIfNeeded(): void {
    const currentUrl = this.router.url.split('?')[0].replace(/\/$/, '');

    if (currentUrl.endsWith('/empresas/create') && this.empresaModalMode !== 'create') {
      this.openCreateModal();
      return;
    }

    if (currentUrl.includes('/empresas/') && currentUrl.endsWith('/edit') && this.empresaModalMode !== 'edit') {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (Number.isFinite(id) && id > 0) {
        this.openPendingEditModal(id);
      }
    }
  }

  private openPendingEditModal(id: number): void {
    this.empresaModalMode = 'edit';
    this.editingEmpresaId = id;
    this.empresaModalErrorMessage = '';
    this.empresaModalSaving = false;
    this.empresaModalLoading = true;
    this.currentLogoUrl = '';
    this.selectedLogo = null;
    this.clearPreviewLogo();

    const empresa = this.empresas.find((item) => item.id === id);
    if (empresa) {
      this.openEditModal(empresa);
      return;
    }

    this.empresaModalLoading = true;
    this.empresaService.get(id).subscribe({
      next: (item) => {
        this.empresaModalLoading = false;
        this.openEditModal(item);
      },
      error: () => {
        this.empresaModalLoading = false;
        this.empresaModalMode = null;
        this.editingEmpresaId = null;
        this.errorMessage = 'No fue posible cargar la empresa para editar.';

        if (this.isRouteDrivenEmpresaModal()) {
          void this.router.navigate(['/empresas']);
        }
      }
    });
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }

  private isRouteDrivenEmpresaModal(): boolean {
    const currentUrl = this.router.url.split('?')[0].replace(/\/$/, '');
    return currentUrl.endsWith('/empresas/create') || (currentUrl.includes('/empresas/') && currentUrl.endsWith('/edit'));
  }
}
