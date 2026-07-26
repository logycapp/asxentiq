import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { AuthService } from '../../core/services/auth.service';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { TrainingCategoryPayload, TrainingService } from '../../core/services/training.service';
import { Select3Component } from '../../shared/select3.component';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, Select3Component],
  template: `
    <app-page-header
      [title]="isEditMode() ? 'Editar programa' : 'Nuevo programa'"
      subtitle="Define el programa que agrupara las capacitaciones."
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
          <li class="breadcrumb-item">
            <a routerLink="/trainings_programs" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">grid_view</span>
              Programas
            </a>
          </li>
          <li class="breadcrumb-item active d-inline-flex align-items-center gap-1" aria-current="page">
            <span class="material-symbols-outlined text-[15px]">{{ isEditMode() ? 'edit' : 'add' }}</span>
            {{ isEditMode() ? 'Editar programa' : 'Nuevo programa' }}
          </li>
        </ol>
      </nav>
    </app-page-header>

    <div *ngIf="message" class="alert alert-success alert-dismissible mb-3">
      <button type="button" class="btn-close" aria-label="Close" (click)="message = ''"></button>
      {{ message }}
    </div>

    <div *ngIf="errorMessage" class="alert alert-danger alert-dismissible mb-3">
      <button type="button" class="btn-close" aria-label="Close" (click)="errorMessage = ''"></button>
      {{ errorMessage }}
    </div>

    <div class="card glass-card border-0 rounded-4 p-4">
      <div *ngIf="loading" class="text-center py-5">
        <div class="text-on-surface-variant font-body-md">Cargando programa...</div>
      </div>

      <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small text-on-surface-variant">Nombre *</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" formControlName="name" />
            <div class="invalid-feedback d-block" *ngIf="form.controls.name.touched && form.controls.name.invalid">
              El nombre es obligatorio.
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label small text-on-surface-variant">Empresa *</label>
            <ng-container *ngIf="!isEmpresaScopedUser; else empresaReadonly">
              <app-select3
                [options]="empresaOptions"
                formControlName="empresa_id"
                placeholder="Selecciona una empresa"
                required
              ></app-select3>
              <div class="invalid-feedback d-block" *ngIf="form.controls.empresa_id.touched && form.controls.empresa_id.invalid">
                Selecciona una empresa.
              </div>
            </ng-container>
            <ng-template #empresaReadonly>
              <div class="form-control bg-transparent border-white/10 text-on-surface d-flex align-items-center">
                {{ scopedEmpresaLabel }}
              </div>
            </ng-template>
          </div>

          <div class="col-12">
            <label class="form-label small text-on-surface-variant">Descripcion</label>
            <textarea rows="3" class="form-control bg-transparent border-white/10 text-on-surface" formControlName="description"></textarea>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 justify-content-end mt-4">
          <a routerLink="/trainings_programs" class="btn btn-outline-light fw-semibold">Cancelar</a>
          <button type="submit" class="btn btn-primary fw-semibold" [disabled]="saving">
            <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
            {{ isEditMode() ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class TrainingCategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly trainingService = inject(TrainingService);
  private readonly empresaService = inject(EmpresaService);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly currentUser = this.authService.getCurrentUser();

  readonly categoryId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.categoryId() !== null);

  loading = false;
  saving = false;
  message = '';
  errorMessage = '';
  empresas: Empresa[] = [];

  get isEmpresaScopedUser(): boolean {
    return Boolean(this.currentUser?.empresa_id && this.currentUser?.role_relation?.slug !== 'admin');
  }

  get scopedEmpresaLabel(): string {
    const empresaId = this.form.controls.empresa_id.value ?? this.currentUser?.empresa_id ?? null;
    return this.empresas.find((empresa) => empresa.id === empresaId)?.name
      ?? this.currentUser?.empresa_relation?.name
      ?? 'Empresa asignada';
  }

  get empresaOptions(): Array<{ value: number; label: string }> {
    return this.empresas.map((empresa) => ({ value: empresa.id, label: empresa.name }));
  }

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    empresa_id: [null as number | null, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadEmpresas();

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
      this.form.controls.empresa_id.setValue(this.currentUser.empresa_id);
    }

    if (id) {
      this.categoryId.set(id);
      this.loadCategory(id);
    }
  }

  loadEmpresas(): void {
    this.loadingService.track(this.empresaService.list()).subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
          this.form.controls.empresa_id.setValue(this.currentUser.empresa_id);
        }
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar la lista de empresas.';
      }
    });
  }

  loadCategory(id: number): void {
    this.loading = true;

    this.loadingService.track(this.trainingService.getCategory(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (category) => {
          this.form.patchValue({
            name: category.name,
            description: category.description ?? '',
            empresa_id: category.empresa_id ?? null
          });

          if (this.isEmpresaScopedUser && this.currentUser?.empresa_id) {
            this.form.controls.empresa_id.setValue(this.currentUser.empresa_id);
          }
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar el programa.';
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    const request = this.isEditMode()
      ? this.trainingService.updateCategory(this.categoryId() as number, payload)
      : this.trainingService.createCategory(payload);

    this.loadingService.track(request)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.router.navigate(['/trainings_programs']);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No fue posible guardar el programa.';
        }
      });
  }

  private buildPayload(): TrainingCategoryPayload {
    const raw = this.form.getRawValue();
    const empresaId = this.isEmpresaScopedUser
      ? (this.currentUser?.empresa_id ?? raw.empresa_id ?? 0)
      : (raw.empresa_id ?? 0);

    return {
      empresa_id: empresaId as number,
      name: raw.name ?? '',
      description: raw.description || null
    };
  }
}
