import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { TrainingCategory, TrainingService } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      title="Programas de capacitaciones"
      subtitle="Organiza primero el programa y luego las capacitaciones que pertenecen a ese programa."
      [showDateFilter]="false"
    />

    <div *ngIf="message" class="alert alert-success alert-dismissible mb-3">
      <button type="button" class="btn-close" aria-label="Close" (click)="message = ''"></button>
      {{ message }}
    </div>

    <div *ngIf="errorMessage" class="alert alert-danger alert-dismissible mb-3">
      <button type="button" class="btn-close" aria-label="Close" (click)="errorMessage = ''"></button>
      {{ errorMessage }}
    </div>

    <div class="card glass-card border-0 rounded-4 p-4 mb-4">
      <div class="row g-3 align-items-center justify-content-between">
        <div class="col-12 col-xl-auto">
          <a routerLink="/trainings_programs/create" class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nuevo programa
          </a>
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
                placeholder="Buscar por nombre o descripcion..."
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
      <a routerLink="/trainings_programs/create" class="btn btn-primary d-inline-flex align-items-center gap-2 fw-semibold">
        <span class="material-symbols-outlined text-[18px]">add</span>
        Nuevo programa
      </a>
    </div>

    <div *ngIf="!loading && filteredCategories.length > 0" class="card glass-card dashboard-table-card border-0 rounded-4 overflow-hidden mb-4">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 dashboard-table">
          <thead class="participant-table-head">
            <tr class="border-bottom border-white/10">
              <th class="ps-4 py-3 font-label-sm text-on-surface-variant text-uppercase participant-table-th">#</th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('name')">
                  Nombre <span class="material-symbols-outlined sort-icon">{{ getSortIcon('name') }}</span>
                </button>
              </th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase participant-table-th">Descripcion</th>
              <th class="py-3 font-label-sm text-on-surface-variant text-uppercase sortable-th participant-table-th">
                <button class="sort-trigger participant-sort-trigger" type="button" (click)="sortBy('trainings_count')">
                  Capacitaciones <span class="material-symbols-outlined sort-icon">{{ getSortIcon('trainings_count') }}</span>
                </button>
              </th>
              <th class="pe-4 py-3 font-label-sm text-on-surface-variant text-uppercase text-end participant-table-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let category of filteredCategories; let i = index">
              <td class="ps-4 py-3 font-mono text-on-surface">{{ category.id }}</td>
              <td class="py-3">
                <span class="text-on-surface fw-semibold">{{ category.name }}</span>
              </td>
              <td class="py-3 text-on-surface-variant">{{ category.description || 'No definido' }}</td>
              <td class="py-3">
                <span class="badge rounded-pill bg-primary/10 text-primary border border-primary/20 px-3 py-2">{{ category.trainings_count ?? 0 }}</span>
              </td>
              <td class="pe-4 py-3 text-end">
                <div class="dashboard-action-group">
                  <a class="btn btn-sm btn-outline-info fw-semibold d-inline-flex align-items-center gap-1" [routerLink]="['/trainings_programs', category.id, 'trainings']" title="Abrir capacitaciones" aria-label="Abrir capacitaciones">
                    <span class="material-symbols-outlined">open_in_new</span>
                  </a>
                  <a class="btn btn-sm btn-warning-light fw-semibold d-inline-flex align-items-center gap-1" [routerLink]="['/trainings_programs', category.id, 'edit']" title="Editar" aria-label="Editar">
                    <span class="material-symbols-outlined">edit</span>
                  </a>
                  <button class="btn btn-sm btn-outline-danger fw-semibold" type="button" (click)="remove(category)" title="Eliminar" aria-label="Eliminar">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
export class TrainingCategoryListComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);

  categories: TrainingCategory[] = [];
  filteredCategories: TrainingCategory[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchTerm = '';
  sortKey = 'id';
  sortDir: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.loadCategories();
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
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los programas.';
        }
      });
  }

  applyFilters(): void {
    let result = [...this.categories];
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((category) =>
        category.name.toLowerCase().includes(term) ||
        (category.description || '').toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const left = this.getSortValue(a, this.sortKey);
      const right = this.getSortValue(b, this.sortKey);
      const comparison = left.localeCompare(right, 'es', { numeric: true, sensitivity: 'base' });
      return this.sortDir === 'asc' ? comparison : -comparison;
    });

    this.filteredCategories = result;
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }

    this.applyFilters();
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) {
      return 'unfold_more';
    }

    return this.sortDir === 'asc' ? 'north' : 'south';
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

  private getSortValue(category: TrainingCategory, key: string): string {
    switch (key) {
      case 'id':
        return String(category.id).padStart(6, '0');
      case 'name':
        return category.name;
      case 'trainings_count':
        return String(category.trainings_count ?? 0).padStart(6, '0');
      case 'sort_order':
        return String(category.sort_order ?? 0).padStart(6, '0');
      default:
        return '';
    }
  }
}
