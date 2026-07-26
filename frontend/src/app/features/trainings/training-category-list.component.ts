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
import { TrainingCategory, TrainingService } from '../../core/services/training.service';
import { Select3Component } from '../../shared/select3.component';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent, Select3Component],
  template: `
    <app-page-header
      title="Programas de capacitaciones"
      subtitle="Organiza primero el programa y luego las capacitaciones que pertenecen a ese programa."
      [showDateFilter]="false"
    >
      <nav header-breadcrumbs aria-label="breadcrumb" class="page-header-breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <a routerLink="/dashboard" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">home</span>
              Inicio
            </a>
          </li>
          <li class="breadcrumb-item">
            <a routerLink="/trainings_programs" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">school</span>
              Capacitaciones
            </a>
          </li>
          <li class="breadcrumb-item active d-inline-flex align-items-center gap-1" aria-current="page">
            <span class="material-symbols-outlined text-[15px]">grid_view</span>
            Programas
          </li>
        </ol>
      </nav>
    </app-page-header>

    <app-swal-alert *ngIf="message" [message]="message" type="success" (closed)="message = ''"></app-swal-alert>
    <app-swal-alert *ngIf="errorMessage" [message]="errorMessage" type="danger" (closed)="errorMessage = ''"></app-swal-alert>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <button class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold" type="button" (click)="openCreateModal()" data-bs-toggle="tooltip" data-bs-placement="top" title="Nuevo programa" aria-label="Nuevo programa">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nuevo programa
          </button>
        </div>
        <div class="col-12 col-xl-auto">
          <div style="width: min(320px, 100%);">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-transparent border-white/10 text-on-surface-variant">
                <span class="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                class="form-control bg-transparent border-white/10 text-on-surface dashboard-table-search"
                type="search"
                placeholder="Buscar por nombre, descripcion o empresa..."
                [(ngModel)]="searchTerm"
                (keyup)="applyFilters()"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">Cargando programas...</div>
    </div>

    <div *ngIf="!loading && filteredCategories.length === 0" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md mb-3">No hay programas registrados.</div>
      <button class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold" type="button" (click)="openCreateModal()" data-bs-toggle="tooltip" data-bs-placement="top" title="Nuevo programa" aria-label="Nuevo programa">
        <span class="material-symbols-outlined text-[18px]">add</span>
        Nuevo programa
      </button>
    </div>

    <div *ngIf="!loading && filteredCategories.length > 0" class="card glass-card dashboard-table-card border-0 rounded-4 overflow-hidden mb-4">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 dashboard-table">
          <thead class="participant-table-head">
            <tr class="border-bottom border-white/10">
              <th class="ps-4 py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('id')" data-bs-toggle="tooltip" data-bs-placement="top" title="Ordenar por ID" aria-label="Ordenar por ID">
                  # <span class="material-symbols-outlined sort-icon">{{ getSortIcon('id') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('name')" data-bs-toggle="tooltip" data-bs-placement="top" title="Ordenar por nombre" aria-label="Ordenar por nombre">
                  Nombre <span class="material-symbols-outlined sort-icon">{{ getSortIcon('name') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('empresa')" data-bs-toggle="tooltip" data-bs-placement="top" title="Ordenar por empresa" aria-label="Ordenar por empresa">
                  Empresa <span class="material-symbols-outlined sort-icon">{{ getSortIcon('empresa') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('description')" data-bs-toggle="tooltip" data-bs-placement="top" title="Ordenar por descripcion" aria-label="Ordenar por descripcion">
                  Descripcion <span class="material-symbols-outlined sort-icon">{{ getSortIcon('description') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('trainings_count')" data-bs-toggle="tooltip" data-bs-placement="top" title="Ordenar por cantidad de capacitaciones" aria-label="Ordenar por cantidad de capacitaciones">
                  Capacitaciones <span class="material-symbols-outlined sort-icon">{{ getSortIcon('trainings_count') }}</span>
                </button>
              </th>
              <th class="pe-4 py-3 font-label-sm text-on-surface-variant text-uppercase text-end participant-table-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let category of paginatedCategories; let i = index">
              <td class="ps-4 py-3 font-mono text-on-surface">{{ category.id }}</td>
              <td class="py-3">
                <span class="text-on-surface fw-semibold">{{ category.name }}</span>
              </td>
              <td class="py-3">
                <span class="text-on-surface-variant">{{ category.empresa?.name || 'No determinada' }}</span>
              </td>
              <td class="py-3 text-on-surface-variant">{{ category.description || 'No definido' }}</td>
              <td class="py-3">
                <span class="badge rounded-pill bg-primary/10 text-primary border border-primary/20 px-3 py-2">{{ category.trainings_count ?? 0 }}</span>
              </td>
              <td class="pe-4 py-3 text-end">
                <div class="dashboard-action-group">
                  <a class="btn btn-sm btn-outline-info fw-semibold d-inline-flex align-items-center gap-1" [routerLink]="['/trainings_programs', category.id, 'trainings']" title="Abrir capacitaciones" aria-label="Abrir capacitaciones" data-bs-toggle="tooltip" data-bs-placement="top">
                    <span class="material-symbols-outlined">open_in_new</span>
                  </a>
                  <button class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1" type="button" (click)="openEditModal(category)" title="Editar" aria-label="Editar" data-bs-toggle="tooltip" data-bs-placement="top">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn btn-sm btn-outline-danger fw-semibold" type="button" (click)="remove(category)" title="Eliminar" aria-label="Eliminar" data-bs-toggle="tooltip" data-bs-placement="top">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div *ngIf="!loading && filteredCategories.length > 0" class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <p class="text-on-surface-variant font-label-sm mb-0">
        Mostrando {{ startRecord }}-{{ endRecord }} de {{ filteredCategories.length }} programas
      </p>
      <nav aria-label="Paginacion de programas">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" [class.disabled]="page === 1">
            <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(1)" aria-label="Primera">
              <span class="material-symbols-outlined text-[16px]">first_page</span>
            </button>
          </li>
          <li class="page-item" [class.disabled]="page === 1">
            <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(page - 1)" aria-label="Anterior">
              <span class="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
          </li>
          <li class="page-item" *ngFor="let p of pageNumbers">
            <button class="page-link bg-transparent border-white/10 text-on-surface" [class.active]="page === p" (click)="onPageChange(p)">{{ p }}</button>
          </li>
          <li class="page-item" [class.disabled]="page === totalPages">
            <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(page + 1)" aria-label="Siguiente">
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </li>
          <li class="page-item" [class.disabled]="page === totalPages">
            <button class="page-link bg-transparent border-white/10 text-on-surface" (click)="onPageChange(totalPages)" aria-label="Ultima">
              <span class="material-symbols-outlined text-[16px]">last_page</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Create Modal -->
    <app-modal-shell
      *ngIf="creating"
      kicker="Programas de capacitaciones"
      title="Nuevo programa"
      subtitle="Define un nuevo programa que agrupara capacitaciones."
      headerVariant="info"
      footerVariant="info"
      size="md"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      primaryLabel="Crear programa"
      secondaryLabel="Cancelar"
      [primaryDisabled]="savingCreate"
      [primaryLoading]="savingCreate"
      (secondaryRequested)="closeCreateModal()"
      (primaryRequested)="saveCreateModal()"
      (closeRequested)="closeCreateModal()"
    >
      <div modal-body>
        <app-swal-alert *ngIf="errorMessage" [message]="errorMessage" type="danger" (closed)="errorMessage = ''"></app-swal-alert>
        <form #createForm="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant" for="createName">Nombre *</label>
            <input #createNameModel="ngModel" id="createName" class="form-control bg-transparent border-white/10 text-on-surface" type="text" [(ngModel)]="createName" name="createName" required />
            <div class="invalid-feedback d-block" *ngIf="(createNameModel.touched || createForm.submitted) && createNameModel.invalid">
              El nombre es obligatorio.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Empresa</label>
            <ng-container *ngIf="!isEmpresaScopedUser; else createEmpresaReadonly">
              <app-select3
                [options]="empresaOptions"
                [(ngModel)]="createEmpresaId"
                name="createEmpresaId"
                placeholder="Selecciona una empresa"
                required
              ></app-select3>
            </ng-container>
            <ng-template #createEmpresaReadonly>
              <div class="form-control bg-transparent border-white/10 text-on-surface d-flex align-items-center">
                {{ scopedEmpresaLabel }}
              </div>
            </ng-template>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant" for="createDescription">Descripcion</label>
            <textarea id="createDescription" rows="3" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="createDescription" name="createDescription"></textarea>
          </div>
        </form>
      </div>
    </app-modal-shell>

    <!-- Edit Modal -->
    <app-modal-shell
      *ngIf="editingCategory"
      kicker="Programas de capacitaciones"
      title="Editar programa"
      [subtitle]="'Actualiza los datos de ' + editingCategory.name + '.'"
      headerVariant="warning"
      footerVariant="warning"
      size="md"
      [showHeaderClose]="true"
      [showFooterClose]="false"
      [showPrimaryButton]="true"
      [showSecondaryButton]="true"
      primaryLabel="Guardar cambios"
      secondaryLabel="Cancelar"
      [primaryDisabled]="savingEdit"
      [primaryLoading]="savingEdit"
      (secondaryRequested)="closeEditModal()"
      (primaryRequested)="saveEditModal()"
      (closeRequested)="closeEditModal()"
    >
      <div modal-body>
        <app-swal-alert *ngIf="errorMessage" [message]="errorMessage" type="danger" (closed)="errorMessage = ''"></app-swal-alert>
        <form #editForm="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant" for="editName">Nombre *</label>
            <input #editNameModel="ngModel" id="editName" class="form-control bg-transparent border-white/10 text-on-surface" type="text" [(ngModel)]="editName" name="editName" required />
            <div class="invalid-feedback d-block" *ngIf="(editNameModel.touched || editForm.submitted) && editNameModel.invalid">
              El nombre es obligatorio.
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant">Empresa</label>
            <ng-container *ngIf="!isEmpresaScopedUser; else editEmpresaReadonly">
              <app-select3
                [options]="empresaOptions"
                [(ngModel)]="editEmpresaId"
                name="editEmpresaId"
                placeholder="Selecciona una empresa"
                required
              ></app-select3>
            </ng-container>
            <ng-template #editEmpresaReadonly>
              <div class="form-control bg-transparent border-white/10 text-on-surface d-flex align-items-center">
                {{ scopedEmpresaLabel }}
              </div>
            </ng-template>
          </div>
          <div class="mb-3">
            <label class="form-label small text-on-surface-variant" for="editDescription">Descripcion</label>
            <textarea id="editDescription" rows="3" class="form-control bg-transparent border-white/10 text-on-surface" [(ngModel)]="editDescription" name="editDescription"></textarea>
          </div>
        </form>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host .participant-table-head th {
      font-size: 0.72rem;
      line-height: 1.1;
      letter-spacing: 0.08em;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host .participant-table-head .sortable-th {
      padding-top: 0.85rem;
      padding-bottom: 0.85rem;
    }

    :host .participant-sort-trigger {
      width: 100%;
      min-height: 1.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.4rem;
      padding: 0;
      white-space: nowrap;
      line-height: 1;
    }

    :host .participant-sort-trigger .sort-icon {
      font-size: 18px !important;
      flex: 0 0 auto;
    }

    :host-context(.light) .participant-table-head th {
      color: #334155;
    }

    :host-context(.light) .participant-sort-trigger {
      color: #1e293b;
    }

    :host-context(.light) .participant-sort-trigger:hover,
    :host-context(.light) .participant-sort-trigger:focus-visible {
      color: #0457bf;
    }
  `]
})
export class TrainingCategoryListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly currentUser = this.authService.getCurrentUser();
  private tooltipInstances = new Map<HTMLElement, Tooltip>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

  categories: TrainingCategory[] = [];
  filteredCategories: TrainingCategory[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchTerm = '';
  sortKey = 'id';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 10;

  // Create modal state
  creating = false;
  createName = '';
  createEmpresaId: number | null = null;
  createDescription = '';
  savingCreate = false;
  @ViewChild('createForm') private createForm?: NgForm;

  // Edit modal state
  editingCategory: TrainingCategory | null = null;
  editName = '';
  editEmpresaId: number | null = null;
  editDescription = '';
  savingEdit = false;
  @ViewChild('editForm') private editForm?: NgForm;

  // Empresas list for select
  empresas: Empresa[] = [];

  get isEmpresaScopedUser(): boolean {
    return Boolean(this.currentUser?.empresa_id && this.currentUser?.role_relation?.slug !== 'admin');
  }

  get scopedEmpresaLabel(): string {
    const empresaId = this.currentUser?.empresa_id ?? this.createEmpresaId ?? this.editEmpresaId ?? null;
    return this.empresas.find((empresa) => empresa.id === empresaId)?.name
      ?? this.currentUser?.empresa_relation?.name
      ?? 'Empresa asignada';
  }

  get empresaOptions() {
    return this.empresas.map((e) => ({
      value: e.id,
      label: e.name,
    }));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCategories.length / this.pageSize));
  }

  get paginatedCategories(): TrainingCategory[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  get startRecord(): number {
    return this.filteredCategories.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredCategories.length);
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

  ngOnInit(): void {
    this.loadCategories();
    this.loadEmpresas();

    if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
      this.createEmpresaId = this.currentUser.empresa_id;
      this.editEmpresaId = this.currentUser.empresa_id;
    }
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

  loadEmpresas(): void {
    this.empresaService.list().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
          this.createEmpresaId = this.currentUser.empresa_id;
          if (!this.editingCategory) {
            this.editEmpresaId = this.currentUser.empresa_id;
          }
        }
      },
      error: () => {
        // Silently fail, empresas will just be empty
      }
    });
  }

  loadCategories(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.getCategories())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
      next: (categories) => {
          this.categories = categories;
          this.applyFilters();
          this.scheduleTooltipRefresh();
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los programas.';
        }
      });
  }

  applyFilters(): void {
    let result = [...this.categories];

    if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
      result = result.filter((category) => category.empresa_id === this.currentUser?.empresa_id);
    }

    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((category) =>
        category.name.toLowerCase().includes(term) ||
        (category.description || '').toLowerCase().includes(term) ||
        (category.empresa?.name || '').toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const left = this.getSortValue(a, this.sortKey);
      const right = this.getSortValue(b, this.sortKey);
      const comparison = left.localeCompare(right, 'es', { numeric: true, sensitivity: 'base' });
      return this.sortDir === 'asc' ? comparison : -comparison;
    });

    this.filteredCategories = result;
    this.page = 1;
    this.scheduleTooltipRefresh();
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }

    this.applyFilters();
    this.scheduleTooltipRefresh();
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) {
      return 'unfold_more';
    }

    return this.sortDir === 'asc' ? 'north' : 'south';
  }

  // Create modal
  openCreateModal(): void {
    this.creating = true;
    this.createName = '';
    this.createEmpresaId = this.isEmpresaScopedUser ? (this.currentUser?.empresa_id ?? null) : null;
    this.createDescription = '';
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

    if (!this.createName.trim()) {
      this.errorMessage = 'El nombre es obligatorio.';
      return;
    }

    const empresaId = this.isEmpresaScopedUser
      ? (this.currentUser?.empresa_id ?? this.createEmpresaId)
      : this.createEmpresaId;

    if (!empresaId) {
      this.errorMessage = 'Selecciona una empresa.';
      return;
    }

    const payload = {
      empresa_id: empresaId,
      name: this.createName.trim(),
      description: this.createDescription.trim() || null
    };

    this.savingCreate = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.createCategory(payload))
      .pipe(finalize(() => (this.savingCreate = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Programa creado correctamente.';
          this.closeCreateModal();
          this.loadCategories();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al crear el programa.';
        }
      });
  }

  // Edit modal
  openEditModal(category: TrainingCategory): void {
    this.editingCategory = category;
    this.editName = category.name;
    this.editEmpresaId = this.isEmpresaScopedUser
      ? (this.currentUser?.empresa_id ?? category.empresa_id ?? null)
      : (category.empresa_id ?? null);
    this.editDescription = category.description ?? '';
    this.errorMessage = '';
    this.savingEdit = false;
  }

  closeEditModal(): void {
    this.editingCategory = null;
  }

  saveEditModal(editForm?: NgForm): void {
    const formInstance = editForm ?? this.editForm;

    if (formInstance?.invalid) {
      formInstance.form.markAllAsTouched();
      return;
    }

    if (!this.editingCategory || !this.editName.trim()) {
      this.errorMessage = 'El nombre es obligatorio.';
      return;
    }

    const empresaId = this.isEmpresaScopedUser
      ? (this.currentUser?.empresa_id ?? this.editEmpresaId)
      : this.editEmpresaId;

    if (!empresaId) {
      this.errorMessage = 'Selecciona una empresa.';
      return;
    }

    const payload = {
      empresa_id: empresaId,
      name: this.editName.trim(),
      description: this.editDescription.trim() || null
    };

    this.savingEdit = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.updateCategory(this.editingCategory.id, payload))
      .pipe(finalize(() => (this.savingEdit = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Programa actualizado correctamente.';
          this.closeEditModal();
          this.loadCategories();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al actualizar el programa.';
        }
      });
  }

  remove(category: TrainingCategory): void {
    if (!window.confirm(`Eliminar el programa "${category.name}"?`)) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteCategory(category.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadCategories();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No fue posible eliminar el programa.';
      }
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

  private getSortValue(category: TrainingCategory, key: string): string {
    switch (key) {
      case 'id':
        return String(category.id).padStart(6, '0');
      case 'name':
        return category.name.toLowerCase();
      case 'empresa':
        return (category.empresa?.name || '').toLowerCase();
      case 'description':
        return (category.description || '').toLowerCase();
      case 'trainings_count':
        return String(category.trainings_count ?? 0).padStart(6, '0');
      case 'sort_order':
        return String(category.sort_order ?? 0).padStart(6, '0');
      default:
        return '';
    }
  }
}
