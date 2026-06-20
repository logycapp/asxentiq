import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { Role, RoleService } from '../../core/services/role.service';
import { UserPayload, UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgbAlertModule],
  templateUrl: './user-form.component.html',
  styles: []
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly userId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.userId() !== null);

  loading = false;
  saving = false;
  message = '';
  errorMessage = '';
  roles: Role[] = [];

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    password_confirmation: [''],
    active: [true, [Validators.required]],
    role: ['user', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadRoles();

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.userId.set(id);
      this.loadUser(id);
    }
  }

  loadUser(id: number): void {
    this.loading = true;
    this.loadingService.track(this.userService.get(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (user) => {
          this.form.patchValue({
            name: user.name,
            email: user.email,
            active: user.active,
            role: user.role ?? 'user'
          });
        },
        error: () => (this.errorMessage = 'No fue posible cargar el usuario.')
      });
  }

  private loadRoles(): void {
    this.loadingService.track(this.roleService.list()).subscribe({
      next: (roles) => {
        this.roles = roles;

        if (!this.form.controls.role.value) {
          this.form.controls.role.setValue(roles[0]?.slug ?? 'user');
        }
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar los roles.';
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
      ? this.userService.update(this.userId() as number, payload)
      : this.userService.create(payload);

    this.loadingService.track(request).pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.message = response.message;
        this.router.navigate(['/users']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar el usuario.';
      }
    });
  }

  private buildPayload(): UserPayload {
    const raw = this.form.getRawValue();
    const payload: UserPayload = {
      name: raw.name ?? '',
      email: raw.email ?? '',
      active: Boolean(raw.active),
      role: raw.role ?? 'user'
    };

    if (raw.password) {
      payload.password = raw.password;
      payload.password_confirmation = raw.password_confirmation ?? '';
    }

    return payload;
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }
}
