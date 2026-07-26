import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Tooltip } from 'bootstrap';
import { finalize } from 'rxjs';

import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { AuthService } from '../../core/services/auth.service';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingParticipant } from '../../core/services/training.service';
import { Select3Component } from '../../shared/select3.component';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-participant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent, Select3Component],
  templateUrl: './participant-list.component.html',
  styleUrls: ['./participant-list.component.css']
})
export class ParticipantListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly currentUser = this.authService.getCurrentUser();
  private tooltipInstances = new Map<HTMLElement, Tooltip>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

  participants: TrainingParticipant[] = [];
  filteredParticipants: TrainingParticipant[] = [];
  empresas: Empresa[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchQuery = '';
  empresaFilterId: number | null = null;
  empresaStateFilter: 'all' | 'active' | 'inactive' = 'all';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  page = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  // Modal state
  editingParticipant: TrainingParticipant | null = null;
  editDocumentNumber = '';
  editFullName = '';
  editEmail = '';
  editPhone = '';
  editEmpresaId: number | null = null;
  saving = false;
  creating = false;
  createDocumentNumber = '';
  createFullName = '';
  createEmail = '';
  createPhone = '';
  createEmpresaId: number | null = null;
  savingCreate = false;
  @ViewChild('createForm') private createForm?: NgForm;
  @ViewChild('editForm') private editForm?: NgForm;

  // Excel import/export
  exporting = false;
  importing = false;

  get isEmpresaScopedUser(): boolean {
    return Boolean(this.currentUser?.empresa_id && this.currentUser?.role_relation?.slug !== 'admin');
  }

  get isAdminUser(): boolean {
    return this.currentUser?.role_relation?.slug === 'admin';
  }

  get scopedEmpresaLabel(): string {
    const empresaId = this.createEmpresaId ?? this.editEmpresaId ?? this.currentUser?.empresa_id ?? null;
    return this.empresas.find((empresa) => empresa.id === empresaId)?.name
      ?? this.currentUser?.empresa_relation?.name
      ?? 'Empresa asignada';
  }

  ngOnInit(): void {
    this.loadParticipants();
    this.loadEmpresas();
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

  get empresaOptions(): Array<{ value: number; label: string }> {
    const scopeId = this.isEmpresaScopedUser ? this.currentUser?.empresa_id ?? null : null;
    const source = scopeId ? this.empresas.filter((empresa) => empresa.id === scopeId) : this.empresas;

    return source.map((empresa) => ({ value: empresa.id, label: empresa.name }));
  }

  get empresaFilterOptions(): Array<{ value: number | null; label: string }> {
    return [
      ...(this.isEmpresaScopedUser && this.currentUser?.empresa_id
        ? []
        : [{ value: null, label: 'Todas las empresas' }]),
      ...this.empresaOptions,
    ];
  }

  get empresaStateOptions(): Array<{ value: 'all' | 'active' | 'inactive'; label: string }> {
    return [
      { value: 'all', label: 'Todas' },
      { value: 'active', label: 'Activas' },
      { value: 'inactive', label: 'Inactivas' },
    ];
  }

  get totalParticipants(): number {
    return this.participants.length;
  }

  get filteredCount(): number {
    return this.filteredParticipants.length;
  }

  get hasActiveFilters(): boolean {
    return this.empresaFilterId !== null || this.empresaStateFilter !== 'all' || this.searchQuery !== '';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredParticipants.length / this.pageSize));
  }

  get paginatedParticipants(): TrainingParticipant[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredParticipants.slice(start, start + this.pageSize);
  }

  get startRecord(): number {
    return this.filteredParticipants.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredParticipants.length);
  }

  loadParticipants(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.getAllParticipants())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.participants = this.isEmpresaScopedUser && this.currentUser?.empresa_id
            ? data.filter((participant) => participant.empresa_id === this.currentUser?.empresa_id)
            : data;
          if (this.isEmpresaScopedUser && this.currentUser?.empresa_id && this.empresaFilterId !== this.currentUser.empresa_id) {
            this.empresaFilterId = this.currentUser.empresa_id;
          }
          this.applyFilter();
          this.scheduleTooltipRefresh();
        },
        error: () => (this.errorMessage = 'Error al cargar participantes.')
      });
  }

  loadEmpresas(): void {
    this.empresaService.list().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
          this.createEmpresaId = this.currentUser.empresa_id;
          if (this.editingParticipant) {
            this.editEmpresaId = this.currentUser.empresa_id;
          }
        }
      }
    });
  }

  openCreateModal(): void {
    this.creating = true;
    this.createDocumentNumber = '';
    this.createFullName = '';
    this.createEmail = '';
    this.createPhone = '';
    this.createEmpresaId = this.isEmpresaScopedUser ? (this.currentUser?.empresa_id ?? null) : null;
    this.errorMessage = '';
    this.savingCreate = false;
  }

  closeCreateModal(): void {
    this.creating = false;
  }

  saveCreateModal(createForm?: NgForm): void {
    const formInstance = createForm ?? this.createForm;

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.createDocumentNumber || !this.createFullName) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    if (!this.createEmpresaId) {
      this.errorMessage = 'Selecciona una empresa.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      empresa_id: this.createEmpresaId,
      document_number: this.createDocumentNumber,
      full_name: this.createFullName,
      email: this.createEmail || undefined,
      phone: this.createPhone || undefined,
    };

    this.savingCreate = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.createParticipant(payload))
      .pipe(finalize(() => (this.savingCreate = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Participante creado correctamente.';
          this.closeCreateModal();
          this.loadParticipants();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al crear participante.';
        }
      });
  }

  openEditModal(participant: TrainingParticipant): void {
    this.editingParticipant = participant;
    this.editDocumentNumber = participant.document_number;
    this.editFullName = participant.full_name;
    this.editEmail = participant.email || '';
    this.editPhone = participant.phone || '';
    this.editEmpresaId = this.isEmpresaScopedUser
      ? (this.currentUser?.empresa_id ?? participant.empresa_id ?? null)
      : (participant.empresa_id ?? null);
    this.errorMessage = '';
    this.saving = false;
  }

  closeEditModal(): void {
    this.editingParticipant = null;
  }

  saveEditModal(editForm?: NgForm): void {
    const formInstance = editForm ?? this.editForm;

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.editingParticipant || !this.editDocumentNumber || !this.editFullName) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    if (!this.editEmpresaId) {
      this.errorMessage = 'Selecciona una empresa.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      empresa_id: this.editEmpresaId,
      document_number: this.editDocumentNumber,
      full_name: this.editFullName,
      email: this.editEmail || undefined,
      phone: this.editPhone || undefined,
    };

    this.saving = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.updateParticipant(this.editingParticipant.id, payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Participante guardado correctamente.';
          this.closeEditModal();
          this.loadParticipants();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al guardar participante.';
        }
      });
  }

  refreshAfterSave(): void {
    this.message = 'Participante guardado correctamente.';
    this.loadParticipants();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.page = 1;
    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.page = 1;
    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  onEmpresaFilterChange(value: number | null): void {
    this.empresaFilterId = value;
    this.page = 1;
    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  onEmpresaStateFilterChange(value: 'all' | 'active' | 'inactive'): void {
    this.empresaStateFilter = value;
    this.page = 1;
    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.empresaStateFilter = 'all';
    this.empresaFilterId = this.isEmpresaScopedUser && this.currentUser?.empresa_id
      ? this.currentUser.empresa_id
      : null;
    this.page = 1;
    this.applyFilter();
    this.scheduleTooltipRefresh();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
      this.scheduleTooltipRefresh();
    }
  }

  onPageSizeChange(): void {
    this.page = 1;
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

  private applyFilter(): void {
    let result = [...this.participants];

    if (this.empresaFilterId !== null) {
      result = result.filter((participant) => participant.empresa_id === this.empresaFilterId);
    }

    if (this.empresaStateFilter !== 'all') {
      result = result.filter((participant) => {
        const companyActive = participant.empresa?.active;
        return this.empresaStateFilter === 'active'
          ? companyActive === true
          : companyActive === false;
      });
    }

    const term = this.searchQuery.trim().toLowerCase();

    if (term) {
      result = result.filter((p) =>
        (p.document_number || '').toLowerCase().includes(term) ||
        (p.full_name || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term) ||
        (p.phone || '').toLowerCase().includes(term) ||
        (p.empresa?.name || '').toLowerCase().includes(term)
      );
    }

    if (this.sortKey === 'document_number') {
      result.sort((a, b) => {
        const cmp = (a.document_number || '').localeCompare(b.document_number || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'full_name') {
      result.sort((a, b) => {
        const cmp = (a.full_name || '').localeCompare(b.full_name || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'email') {
      result.sort((a, b) => {
        const cmp = (a.email || '').localeCompare(b.email || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'phone') {
      result.sort((a, b) => {
        const cmp = (a.phone || '').localeCompare(b.phone || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredParticipants = result;
    this.scheduleTooltipRefresh();
  }

  downloadReport(): void {
    if (this.exporting) return;

    this.errorMessage = '';
    this.exporting = true;

    this.loadingService.track(this.trainingService.downloadParticipantsReport())
      .pipe(finalize(() => (this.exporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'reporte-participantes.xlsx';
          link.click();
          window.URL.revokeObjectURL(url);
          this.message = 'Reporte Excel descargado correctamente.';
        },
        error: () => (this.errorMessage = 'Error al descargar el reporte Excel.')
      });
  }

  importReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.importing) {
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.importing = true;

    this.loadingService.track(this.trainingService.importParticipantsReport(file))
      .pipe(finalize(() => {
        this.importing = false;
        input.value = '';
      }))
      .subscribe({
      next: (result) => {
          this.message = `Carga procesada: ${result.created} creados, ${result.updated} actualizados y ${result.skipped} omitidos.`;
          if (result.errors.length > 0) {
            this.errorMessage = `Se omitieron ${result.skipped} filas por errores de validacion.`;
          }
          this.loadParticipants();
        },
        error: () => (this.errorMessage = 'Error al cargar el Excel de participantes.')
      });
  }

  remove(p: TrainingParticipant): void {
    if (!window.confirm(`Eliminar a ${p.full_name}?`)) return;

    this.loadingService.track(this.trainingService.deleteParticipant(p.id)).subscribe({
      next: (res) => {
        this.message = res.message;
        this.loadParticipants();
      },
      error: () => (this.errorMessage = 'Error al eliminar.')
    });
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
}
