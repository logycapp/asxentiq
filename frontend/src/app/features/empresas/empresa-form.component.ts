import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EmpresaService } from '../../core/services/empresa.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './empresa-form.component.html',
  styles: []
})
export class EmpresaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly empresaId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.empresaId() !== null);

  loading = false;
  saving = false;
  message = '';
  errorMessage = '';
  currentLogoUrl = '';
  selectedLogo: File | null = null;
  previewLogoUrl = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    tax_id: [''],
    address: [''],
    phone: [''],
    email: [''],
    active: [true, [Validators.required]]
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.empresaId.set(id);
      this.loadEmpresa(id);
    }
  }

  loadEmpresa(id: number): void {
    this.loading = true;

    this.loadingService.track(this.empresaService.get(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (empresa) => {
          this.form.patchValue({
            name: empresa.name,
            tax_id: empresa.tax_id ?? '',
            address: empresa.address ?? '',
            phone: empresa.phone ?? '',
            email: empresa.email ?? '',
            active: empresa.active
          });
          this.currentLogoUrl = empresa.logo_url ?? '';
        },
        error: () => (this.errorMessage = 'No fue posible cargar la empresa.')
      });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedLogo = file;

    if (this.previewLogoUrl) {
      URL.revokeObjectURL(this.previewLogoUrl);
      this.previewLogoUrl = '';
    }

    if (file) {
      this.previewLogoUrl = URL.createObjectURL(file);
    }
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
      ? this.empresaService.update(this.empresaId() as number, payload)
      : this.empresaService.create(payload);

    this.loadingService.track(request).pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.message = response.message;
        if (this.previewLogoUrl) {
          URL.revokeObjectURL(this.previewLogoUrl);
          this.previewLogoUrl = '';
        }
        this.selectedLogo = null;
        this.router.navigate(['/empresas']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar la empresa.';
      }
    });
  }

  private buildPayload(): FormData {
    const raw = this.form.getRawValue();

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

  get displayLogoUrl(): string {
    return this.previewLogoUrl || this.currentLogoUrl;
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }
}
