import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { TestService, TestUploadResponse } from '../../core/services/test.service';

@Component({
  selector: 'app-test-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgbAlertModule],
  templateUrl: './test-form.component.html',
  styles: []
})
export class TestFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly testService = inject(TestService);

  loading = false;
  errorMessage = '';
  response: TestUploadResponse | null = null;
  selectedFile: File | null = null;

  readonly form = this.fb.group({
    dato1: ['', [Validators.required, Validators.maxLength(255)]],
    dato2: ['', [Validators.required, Validators.maxLength(255)]]
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submit(): void {
    if (this.form.invalid || !this.selectedFile) {
      this.form.markAllAsTouched();
      if (!this.selectedFile) {
        this.errorMessage = 'Selecciona un archivo adjunto.';
      }
      return;
    }

    const raw = this.form.getRawValue();
    const payload = new FormData();
    payload.append('dato1', raw.dato1 ?? '');
    payload.append('dato2', raw.dato2 ?? '');
    payload.append('adjunto', this.selectedFile);

    this.loading = true;
    this.errorMessage = '';
    this.response = null;

    this.testService.submit(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.response = response;
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible enviar el formulario.';
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
}
