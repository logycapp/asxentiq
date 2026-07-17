import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { TrainingCategoryPayload, TrainingService } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="isEditMode() ? 'Editar programa' : 'Nuevo programa'"
      subtitle="Define el programa que agrupara las capacitaciones."
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

    <div class="card glass-card border-0 rounded-4 p-4">
      <div *ngIf="loading" class="text-center py-5">
        <div class="text-on-surface-variant font-body-md">Cargando programa...</div>
      </div>

      <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="row g-3">
          <div class="col-md-8">
            <label class="form-label small text-on-surface-variant">Nombre *</label>
            <input class="form-control bg-transparent border-white/10 text-on-surface" formControlName="name" />
            <div class="invalid-feedback d-block" *ngIf="form.controls.name.touched && form.controls.name.invalid">
              El nombre es obligatorio.
            </div>
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
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categoryId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.categoryId() !== null);

  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['']
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.categoryId.set(id);
      this.loadCategory(id);
    }
  }

  loadCategory(id: number): void {
    this.loading = true;

    this.loadingService.track(this.trainingService.getCategory(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (category) => {
          this.form.patchValue({
            name: category.name,
            description: category.description ?? ''
          });
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

    return {
      name: raw.name ?? '',
      description: raw.description || null
    };
  }
}
