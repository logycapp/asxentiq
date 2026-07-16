import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styles: [`
    .profile-media-card {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 1rem;
      background: rgba(15, 23, 42, 0.03);
      overflow: hidden;
    }

    .profile-media-card--main {
      min-height: 200px;
      aspect-ratio: 1 / 1;
      max-width: 100%;
    }

    .profile-media-card--compact {
      min-height: 160px;
      aspect-ratio: 1 / 1;
      width: 100%;
    }

    .profile-media-card img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 10px;
      display: block;
    }

    .profile-media-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(100, 116, 139, 0.9);
      font-weight: 700;
    }

    .profile-avatar-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      align-items: start;
    }

    @media (max-width: 767.98px) {
      .profile-avatar-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);

  loading = false;
  saving = false;
  generatingAvatar = false;
  message = '';
  errorMessage = '';
  currentPhotoUrl = '';
  currentAvatarUrl = '';
  selectedPhoto: File | null = null;
  previewUrl = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    menuLayout: ['top', [Validators.required]],
    photo: [null as File | null]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  get hasOriginalPhoto(): boolean {
    return Boolean(this.currentPhotoUrl);
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.profileService.get())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.form.patchValue({
            name: response.user.name,
            email: response.user.email,
            menuLayout: response.user.menu_layout === 'left' ? 'left' : 'top'
          });
          this.currentPhotoUrl = response.user.profile_photo_url ?? '';
          this.currentAvatarUrl = response.user.avatar_photo_url ?? '';
          this.authService.setCurrentUser(response.user);
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar el perfil.';
        }
      });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedPhoto = file;
    this.form.controls.photo.setValue(file);

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = '';
    }

    if (file) {
      this.previewUrl = URL.createObjectURL(file);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const raw = this.form.getRawValue();
    const payload = new FormData();
    payload.append('name', raw.name ?? '');
    payload.append('email', raw.email ?? '');
    payload.append('menu_layout', raw.menuLayout ?? 'top');

    if (this.selectedPhoto) {
      payload.append('photo', this.selectedPhoto);
    }

    this.loadingService
      .track(this.profileService.update(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.currentPhotoUrl = response.user.profile_photo_url ?? '';
          this.currentAvatarUrl = response.user.avatar_photo_url ?? '';
          this.selectedPhoto = null;
          this.previewUrl = '';
          this.form.controls.photo.setValue(null);
          this.authService.setCurrentUser(response.user);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar el perfil.';
        }
      });
  }

  generateAvatar(): void {
    if (!this.currentPhotoUrl) {
      this.errorMessage = 'Primero debes guardar una fotografia original.';
      return;
    }

    this.generatingAvatar = true;
    this.message = '';
    this.errorMessage = '';

    this.loadingService
      .track(this.profileService.generateAvatar())
      .pipe(finalize(() => (this.generatingAvatar = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.currentAvatarUrl = response.user.avatar_photo_url ?? '';
          this.authService.setCurrentUser(response.user);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No fue posible generar el avatar.';
        }
      });
  }

  get displayOriginalUrl(): string {
    return this.previewUrl || this.currentPhotoUrl;
  }

  get displayAvatarUrl(): string {
    return this.currentAvatarUrl;
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }
}
