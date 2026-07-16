import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Training, TrainingMaterial, TrainingService } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-video-indexaction',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      title="Video Index Action"
      subtitle="Selecciona una capacitacion con material de video y reproducela sin salir del sistema."
      [showDateFilter]="false"
    />

    <div *ngIf="loading" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">Cargando material de video...</div>
    </div>

    <div *ngIf="!loading && loadingTrainingDetail" class="text-center py-5">
      <div class="text-on-surface-variant font-body-md">Cargando capacitacion seleccionada...</div>
    </div>

    <div *ngIf="!loading && errorMessage" class="alert alert-danger mb-4">
      {{ errorMessage }}
    </div>

    <div *ngIf="!loading && !loadingTrainingDetail && !errorMessage && !currentTraining" class="card glass-card border-0 rounded-4 p-4">
      <div class="text-on-surface-variant font-body-md">
        No hay capacitaciones con material de video disponibles.
      </div>
    </div>

    <div *ngIf="!loading && !loadingTrainingDetail && currentTraining && !currentMaterial" class="card glass-card border-0 rounded-4 p-4">
      <div class="text-on-surface-variant font-body-md">
        La capacitacion seleccionada no tiene un material de video disponible.
      </div>
    </div>

    <div *ngIf="!loading && !loadingTrainingDetail && currentTraining && currentMaterial" class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="card glass-card border-0 rounded-4 overflow-hidden h-100">
          <div class="p-3 p-md-4">
            <div class="ratio ratio-16x9 rounded-4 overflow-hidden bg-black">
              <video *ngIf="isVideoMime(currentMaterial)" [src]="currentVideoUrl" controls playsinline class="w-100 h-100">
                Tu navegador no soporta reproduccion de video.
              </video>

              <iframe
                *ngIf="!isVideoMime(currentMaterial)"
                [src]="currentVideoUrl"
                class="w-100 h-100 border-0"
                title="Material de capacitacion"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="card glass-card border-0 rounded-4 p-4 h-100 d-flex align-items-center justify-content-center text-center">
          <h2 class="text-on-surface mb-0">Indexacion</h2>
        </div>
      </div>
    </div>
  `,
})
export class VideoIndexActionComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  trainings: Training[] = [];
  loading = false;
  loadingTrainingDetail = false;
  errorMessage = '';
  selectedTrainingId: number | null = null;
  selectedMaterialId: number | null = null;
  trainingDetail: Training | null = null;

  ngOnInit(): void {
    const initialTrainingId = Number(this.route.snapshot.queryParamMap.get('training') ?? 0) || null;
    const initialMaterialId = Number(this.route.snapshot.queryParamMap.get('material') ?? 0) || null;

    this.loadTrainings(initialTrainingId, initialMaterialId);
  }

  get videoTrainings(): Training[] {
    return this.trainings;
  }

  get currentTraining(): Training | null {
    return this.trainingDetail;
  }

  get videoMaterials(): TrainingMaterial[] {
    return this.currentTraining ? this.getVideoMaterials(this.currentTraining) : [];
  }

  get currentMaterial(): TrainingMaterial | null {
    if (this.selectedMaterialId === null) {
      return null;
    }

    return this.videoMaterials.find((material) => material.id === this.selectedMaterialId) ?? null;
  }

  get currentVideoUrl(): string {
    return this.currentMaterial ? `/api/storage/${this.currentMaterial.filepath}` : '';
  }

  loadTrainings(preselectedTrainingId: number | null = null, preselectedMaterialId: number | null = null): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.list({ per_page: 100, sort_by: 'scheduled_date', sort_dir: 'desc' }))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.trainings = response.data;

          const firstTraining = this.trainings[0] ?? null;
          const selectedTraining =
            (preselectedTrainingId !== null
              ? this.trainings.find((training) => training.id === preselectedTrainingId) ?? null
              : null) || firstTraining;

          this.selectedTrainingId = selectedTraining?.id ?? null;

          if (this.selectedTrainingId !== null) {
            this.loadTrainingDetail(this.selectedTrainingId, preselectedMaterialId);
          }
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar los materiales de video.';
        }
      });
  }

  onTrainingChange(trainingId: number | null): void {
    this.selectedTrainingId = trainingId;
    this.selectedMaterialId = null;
    this.trainingDetail = null;

    if (trainingId !== null) {
      this.loadTrainingDetail(trainingId);
      return;
    }

    this.syncRouteSelection();
  }

  onMaterialChange(materialId: number | null): void {
    this.selectedMaterialId = materialId;
    this.syncRouteSelection();
  }

  selectMaterial(materialId: number): void {
    this.selectedMaterialId = materialId;
    this.syncRouteSelection();
  }

  isVideoMime(material: TrainingMaterial): boolean {
    return material.type === 'video' || (material.mime_type || '').startsWith('video/');
  }

  trackById(_: number, item: Training): number {
    return item.id;
  }

  trackByMaterialId(_: number, item: TrainingMaterial): number {
    return item.id;
  }

  private getVideoMaterials(training: Training): TrainingMaterial[] {
    return (training.materials ?? []).filter((material) => this.isVideoMime(material));
  }

  private loadTrainingDetail(trainingId: number, preselectedMaterialId: number | null = null): void {
    this.loadingTrainingDetail = true;
    this.trainingDetail = null;
    this.selectedMaterialId = null;

    this.loadingService
      .track(this.trainingService.get(trainingId))
      .pipe(finalize(() => (this.loadingTrainingDetail = false)))
      .subscribe({
        next: (training) => {
          this.trainingDetail = training;

          const materials = this.getVideoMaterials(training);
          const selectedMaterial =
            (preselectedMaterialId !== null
              ? materials.find((material) => material.id === preselectedMaterialId) ?? null
              : null) || materials[0] || null;

          this.selectedMaterialId = selectedMaterial?.id ?? null;
          this.syncRouteSelection();
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar la capacitacion seleccionada.';
        }
      });
  }

  private syncRouteSelection(): void {
    const queryParams: Record<string, number> = {};

    if (this.selectedTrainingId !== null) {
      queryParams['training'] = this.selectedTrainingId;
    }

    if (this.selectedMaterialId !== null) {
      queryParams['material'] = this.selectedMaterialId;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }
}
