import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { EmpresaService } from '../../core/services/empresa.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ModalShellComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  loading = false;
  errorMessage = '';
  recoveryOpen = false;
  recoveryLoading = false;
  recoveryError = '';
  recoveryMessage = '';
  companyLogoUrl = 'assets/template/logos/logo_principal/logo_dark.png';
  companyName = 'Asxentiq';

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly recoveryForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const token = params.get('token');

          if (!token) {
            this.companyLogoUrl = 'assets/template/logos/logo_principal/logo_dark.png';
            this.companyName = 'Asxentiq';
            return of(null);
          }

          return this.empresaService.getByToken(token).pipe(
            catchError(() => of(null))
          );
        })
      )
      .subscribe((empresa) => {
        if (!empresa) {
          return;
        }

        this.companyName = empresa.name || 'Asxentiq';
        this.companyLogoUrl = empresa.logo_url || 'assets/template/logos/logo_principal/logo_dark.png';
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.getRawValue();

    this.authService.login(email ?? '', password ?? '')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error) => {
          this.errorMessage = error?.error?.message || error?.error?.errors?.email?.[0] || 'No fue posible iniciar sesion.';
        }
      });
  }

  openRecoveryModal(): void {
    this.recoveryError = '';
    this.recoveryMessage = '';
    this.recoveryForm.patchValue({
      email: this.form.controls.email.value ?? ''
    });
    this.recoveryForm.markAsPristine();
    this.recoveryForm.markAsUntouched();
    this.recoveryOpen = true;
  }

  closeRecoveryModal(): void {
    if (this.recoveryLoading) {
      return;
    }

    this.recoveryOpen = false;
  }

  submitRecovery(): void {
    if (this.recoveryLoading) {
      return;
    }

    this.recoveryForm.markAllAsTouched();

    if (this.recoveryForm.invalid) {
      return;
    }

    this.recoveryLoading = true;
    this.recoveryError = '';
    this.recoveryMessage = '';

    const email = this.recoveryForm.controls.email.value ?? '';

    this.authService.requestPasswordReset(email)
      .pipe(finalize(() => (this.recoveryLoading = false)))
      .subscribe({
        next: (response) => {
          this.recoveryMessage = response.message;
        },
        error: (error) => {
          this.recoveryError = error?.error?.message || error?.error?.errors?.email?.[0] || 'No fue posible enviar el correo de restauracion.';
        }
      });
  }
}
