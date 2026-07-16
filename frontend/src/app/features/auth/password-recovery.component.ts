import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.component.html'
})
export class PasswordRecoveryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  loading = false;
  errorMessage = '';
  successMessage = '';
  mode: 'request' | 'reset' = 'request';

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    token: [''],
    password: [''],
    password_confirmation: ['']
  });

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const email = query.get('email') ?? '';
    const token = query.get('token') ?? '';

    this.form.patchValue({
      email,
      token
    });

    this.setMode(token !== '');
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const raw = this.form.getRawValue();

    if (this.mode === 'request') {
      this.authService.requestPasswordReset(raw.email ?? '')
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.successMessage = response.message;
          },
          error: (error) => {
            this.errorMessage = error?.error?.message || error?.error?.errors?.email?.[0] || 'No fue posible enviar el correo de restauracion.';
          }
        });

      return;
    }

    this.authService.resetPassword({
      email: raw.email ?? '',
      token: raw.token ?? '',
      password: raw.password ?? '',
      password_confirmation: raw.password_confirmation ?? ''
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.successMessage = response.message;
          window.setTimeout(() => {
            void this.router.navigate(['/login']);
          }, 1800);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || error?.error?.errors?.token?.[0] || 'No fue posible actualizar la contrasena.';
        }
      });
  }

  private setMode(resetMode: boolean): void {
    this.mode = resetMode ? 'reset' : 'request';

    const passwordValidators = resetMode ? [Validators.required, Validators.minLength(8)] : [];
    const confirmationValidators = resetMode ? [Validators.required] : [];

    this.form.controls.password.setValidators(passwordValidators);
    this.form.controls.password_confirmation.setValidators(confirmationValidators);
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    this.form.controls.password_confirmation.updateValueAndValidity({ emitEvent: false });
  }
}
