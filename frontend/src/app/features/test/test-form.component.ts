import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { TestAudioResponse, TestService, TestUploadResponse } from '../../core/services/test.service';

@Component({
  selector: 'app-test-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgbAlertModule],
  templateUrl: './test-form.component.html',
  styles: []
})
export class TestFormComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly testService = inject(TestService);

  loading = false;
  errorMessage = '';
  response: TestUploadResponse | null = null;
  selectedVideo: File | null = null;
  previewUrl: string | null = null;
  uploadedVideoUrl: string | null = null;
  extractedAudio: TestAudioResponse | null = null;
  extractedAudioUrl: string | null = null;
  extractingAudio = false;
  extractErrorMessage = '';

  readonly audioForm = this.fb.group({
    videoPath: ['', [Validators.required, Validators.maxLength(1024)]]
  });

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(255)]]
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.clearPreview();
    this.selectedVideo = file;
    this.previewUrl = file ? URL.createObjectURL(file) : null;
  }

  submit(): void {
    if (this.form.invalid || !this.selectedVideo) {
      this.form.markAllAsTouched();
      if (!this.selectedVideo) {
        this.errorMessage = 'Selecciona un video.';
      }
      return;
    }

    const raw = this.form.getRawValue();
    const payload = new FormData();
    payload.append('titulo', raw.titulo ?? '');
    payload.append('video', this.selectedVideo);

    this.loading = true;
    this.errorMessage = '';
    this.response = null;

      this.testService.submit(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.response = response;
          this.uploadedVideoUrl = this.resolveStorageUrl(response.video.url);
          this.audioForm.patchValue({
            videoPath: response.video.path ?? ''
          });
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible enviar el formulario.';
        }
      });
  }

  resetForm(): void {
    this.form.reset();
    this.clearPreview();
    this.selectedVideo = null;
    this.uploadedVideoUrl = null;
    this.errorMessage = '';
    this.response = null;
    this.extractedAudio = null;
    this.extractedAudioUrl = null;
    this.extractErrorMessage = '';
    this.audioForm.reset();
  }

  extractAudio(): void {
    if (this.audioForm.invalid) {
      this.audioForm.markAllAsTouched();
      return;
    }

    const videoPath = this.audioForm.getRawValue().videoPath?.trim() ?? '';
    if (!videoPath) {
      this.extractErrorMessage = 'Indica la ruta del video.';
      return;
    }

    this.extractingAudio = true;
    this.extractErrorMessage = '';
    this.extractedAudio = null;
    this.extractedAudioUrl = null;

    this.testService.extractAudio(videoPath)
      .pipe(finalize(() => (this.extractingAudio = false)))
      .subscribe({
        next: (response) => {
          this.extractedAudio = response;
          this.extractedAudioUrl = this.resolveStorageUrl(response.audio.url);
          this.audioForm.patchValue({
            videoPath: response.source.video_path
          });
        },
        error: (error) => {
          this.extractErrorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible extraer el audio.';
        }
      });
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }

  private clearPreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  private resolveStorageUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:8000${normalized}`;
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }
}
