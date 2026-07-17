import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { LoadingService } from '../../core/services/loading.service';
import { RolePayload, RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SwalAlertComponent],
  templateUrl: './role-form.component.html'
})
export class RoleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roleId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.roleId() !== null);

  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    slug: ['', [Validators.maxLength(255), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    description: [''],
    is_system: [false]
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.roleId.set(id);
      this.loadRole(id);
    }
  }

  loadRole(id: number): void {
    this.loading = true;

    this.loadingService
      .track(this.roleService.get(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (role) => {
          this.form.patchValue({
            name: role.name,
            slug: role.slug,
            description: role.description ?? '',
            is_system: role.is_system
          });
        },
        error: () => (this.errorMessage = 'No fue posible cargar el rol.')
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
      ? this.roleService.update(this.roleId() as number, payload)
      : this.roleService.create(payload);

    this.loadingService.track(request).pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.message = response.message;
        this.router.navigate(['/roles']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No fue posible guardar el rol.';
      }
    });
  }

  private buildPayload(): RolePayload {
    const raw = this.form.getRawValue();

    return {
      name: raw.name ?? '',
      slug: raw.slug || undefined,
      description: raw.description || null,
      is_system: Boolean(raw.is_system)
    };
  }
}
