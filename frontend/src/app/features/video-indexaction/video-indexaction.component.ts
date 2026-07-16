import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Training, TrainingMaterial, TrainingService } from '../../core/services/training.service';
import {
  VideoIndexActionService,
  VideoIndexAnalysisResponse,
  VideoIndexAudioResponse,
  VideoIndexStoredResponse
} from '../../core/services/video-indexaction.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-video-indexaction',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
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
              <video *ngIf="isVideoMime(currentMaterial)" [src]="currentVideoUrl" controls playsinline preload="auto" class="w-100 h-100">
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
        <div class="card glass-card border-0 rounded-4 p-4 h-100">
          <h2 class="text-on-surface mb-3">Indexacion</h2>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              class="btn btn-outline-info fw-semibold d-inline-flex align-items-center justify-content-center gap-2"
              [disabled]="!currentMaterial || !isVideoMime(currentMaterial) || extractingAudio"
              (click)="extractAudio()"
            >
              <span class="material-symbols-outlined text-[18px]">audio_file</span>
              {{ extractingAudio ? 'Extrayendo...' : 'Extraer audio' }}
            </button>

            <button
              type="button"
              class="btn btn-primary fw-semibold d-inline-flex align-items-center justify-content-center gap-2"
              [disabled]="!extractedAudio || analyzingAudio"
              (click)="indexAudio()"
            >
              <span class="material-symbols-outlined text-[18px]">psychology</span>
              {{ analyzingAudio ? 'Indexando...' : 'Indexar MP3' }}
            </button>
          </div>

          <div *ngIf="extractErrorMessage" class="alert alert-danger mb-3">
            {{ extractErrorMessage }}
          </div>

          <div *ngIf="analysisErrorMessage" class="alert alert-danger mb-3">
            {{ analysisErrorMessage }}
          </div>

          <div *ngIf="extractedAudio" class="card border-0 rounded-4 bg-body-tertiary mb-3">
            <div class="card-body">
              <div class="d-flex flex-column gap-2">
                <div class="text-on-surface font-body-md fw-semibold">Audio extraido</div>
                <a
                  *ngIf="extractedAudioUrl"
                  [href]="extractedAudioUrl"
                  target="_blank"
                  rel="noopener"
                  class="link-primary text-decoration-none fw-semibold"
                >
                  Abrir MP3
                </a>
              </div>
            </div>
          </div>

          <div *ngIf="analysisResponse" class="card border-0 rounded-4 bg-body-tertiary">
            <div class="card-body">
              <div class="text-on-surface font-body-md fw-semibold mb-3">Resultado de indexacion</div>

              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <div class="text-on-surface-variant small">Titulo detectado</div>
                  <div class="text-on-surface fw-semibold">{{ analysisResponse.titulo_detectado }}</div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="text-on-surface-variant small">Idioma</div>
                  <div class="text-on-surface fw-semibold">{{ analysisResponse.idioma }}</div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="text-on-surface-variant small">Duracion aproximada</div>
                  <div class="text-on-surface fw-semibold">{{ analysisResponse.duracion_aproximada_segundos }} s</div>
                </div>
                <div class="col-12">
                  <div class="text-on-surface-variant small">Resumen</div>
                  <div class="text-on-surface">{{ analysisResponse.resumen_general }}</div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="text-on-surface-variant small">Audio indexado</div>
                  <div class="text-on-surface fw-semibold">{{ extractedAudio?.audio?.original_name ?? 'No determinado' }}</div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="text-on-surface-variant small">Estado</div>
                  <div class="text-on-surface fw-semibold">
                    {{ analysisResponse ? 'Indexado' : 'Sin indexar' }}
                  </div>
                </div>
              </div>

              <div class="mt-4">
                <div class="text-on-surface-variant small mb-2">Temas detectados</div>
                <ul class="nav nav-tabs">
                  <li *ngFor="let tema of analysisResponse.temas_detectados; let i = index" class="nav-item">
                    <button
                      type="button"
                      class="nav-link"
                      [class.active]="selectedTemaIndex === i"
                      (click)="selectedTemaIndex = i"
                    >
                      {{ tema.orden }}. {{ tema.tema }}
                    </button>
                  </li>
                </ul>

                <div class="border border-top-0 rounded-bottom p-3 bg-body">
                  <ng-container *ngIf="analysisResponse.temas_detectados[selectedTemaIndex] as temaActiva">
                    <div class="d-flex flex-column gap-3">
                      <div>
                        <div class="text-on-surface-variant small">Rango</div>
                        <div class="text-on-surface fw-semibold">{{ temaActiva.inicio }}s - {{ temaActiva.fin }}s</div>
                      </div>

                      <div *ngFor="let segmento of getSegmentsForTheme(temaActiva.orden)" class="p-3 rounded-4 bg-body-tertiary">
                        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                          <span class="badge text-bg-primary">#{{ segmento.orden }}</span>
                          <span class="text-on-surface fw-semibold">{{ segmento.tema }}</span>
                        </div>

                        <div class="mb-2">
                          <div class="text-on-surface-variant small">Subtema</div>
                          <div class="text-on-surface">{{ segmento.subtema || 'No determinado' }}</div>
                        </div>

                        <div class="mb-2">
                          <div class="text-on-surface-variant small">Resumen</div>
                          <div class="text-on-surface">{{ segmento.resumen }}</div>
                        </div>

                        <div class="mb-2">
                          <div class="text-on-surface-variant small">Texto</div>
                          <div class="text-on-surface">{{ segmento.texto }}</div>
                        </div>

                        <div class="mb-2">
                          <div class="text-on-surface-variant small mb-1">Palabras clave</div>
                          <div class="d-flex flex-wrap gap-2">
                            <span *ngFor="let palabra of segmento.palabras_clave" class="badge text-bg-secondary">
                              {{ palabra }}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div class="text-on-surface-variant small mb-1">Preguntas posibles</div>
                          <ul class="mb-0 ps-3">
                            <li *ngFor="let pregunta of segmento.preguntas_posibles" class="text-on-surface mb-1">
                              {{ pregunta }}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </ng-container>
                </div>
              </div>

            </div>
          </div>
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
  private readonly videoIndexActionService = inject(VideoIndexActionService);

  trainings: Training[] = [];
  loading = false;
  loadingTrainingDetail = false;
  errorMessage = '';
  selectedTrainingId: number | null = null;
  selectedMaterialId: number | null = null;
  trainingDetail: Training | null = null;
  extractedAudio: VideoIndexAudioResponse | null = null;
  extractedAudioUrl: string | null = null;
  analysisResponse: VideoIndexAnalysisResponse | null = null;
  extractingAudio = false;
  extractErrorMessage = '';
  analyzingAudio = false;
  analysisErrorMessage = '';
  selectedTemaIndex = 0;

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
    return this.currentMaterial?.url ?? '';
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
    this.clearAudioState();

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
    this.clearAudioState();

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
          this.loadStoredIndexation(training.id);
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar la capacitacion seleccionada.';
        }
      });
  }

  extractAudio(): void {
    if (!this.currentMaterial || !this.isVideoMime(this.currentMaterial)) {
      this.extractErrorMessage = 'Selecciona un video valido.';
      return;
    }

    this.extractingAudio = true;
    this.extractErrorMessage = '';
    this.analysisResponse = null;
    this.analysisErrorMessage = '';
    this.extractedAudio = null;
    this.extractedAudioUrl = null;

    this.loadingService
      .track(this.videoIndexActionService.extractAudio(this.currentMaterial.filepath))
      .pipe(finalize(() => (this.extractingAudio = false)))
      .subscribe({
        next: (response) => {
          this.extractedAudio = response;
          this.extractedAudioUrl = response.audio.url;
        },
        error: (error) => {
          this.extractErrorMessage = error?.error?.message || 'No fue posible extraer el audio.';
        }
      });
  }

  indexAudio(): void {
    const audioPath = this.extractedAudio?.audio.path;

    if (!audioPath || this.selectedTrainingId === null) {
      this.analysisErrorMessage = 'Primero extrae el audio del video.';
      return;
    }

    this.analyzingAudio = true;
    this.analysisErrorMessage = '';
    this.analysisResponse = null;

    this.loadingService
      .track(this.videoIndexActionService.analyzeAudio(this.selectedTrainingId, audioPath))
      .pipe(finalize(() => (this.analyzingAudio = false)))
      .subscribe({
        next: (response) => {
          this.analysisResponse = response;
        },
        error: (error) => {
          this.analysisErrorMessage = error?.error?.message || 'No fue posible indexar el audio.';
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

  private clearAudioState(): void {
    this.extractedAudio = null;
    this.extractedAudioUrl = null;
    this.analysisResponse = null;
    this.extractingAudio = false;
    this.extractErrorMessage = '';
    this.analyzingAudio = false;
    this.analysisErrorMessage = '';
  }

  private loadStoredIndexation(trainingId: number): void {
    this.videoIndexActionService.getIndexation(trainingId).subscribe({
      next: (response: VideoIndexStoredResponse) => {
        this.analysisResponse = response.result_data ?? null;
        this.selectedTemaIndex = 0;

        if (response.audio_path && response.audio_url) {
          const originalName = response.audio_path.split('/').pop() ?? 'audio.mp3';
          this.extractedAudio = {
            message: 'Audio extraido correctamente.',
            source: {
              video_path: this.currentMaterial?.filepath ?? '',
              video_url: this.currentMaterial?.url ?? this.currentVideoUrl
            },
            audio: {
              original_name: originalName,
              path: response.audio_path,
              url: response.audio_url
            }
          };
          this.extractedAudioUrl = response.audio_url;
        }
      },
      error: () => {
        this.analysisResponse = null;
      }
    });
  }

  getSegmentsForTheme(themeOrder: number): VideoIndexAnalysisResponse['segmentos'] {
    if (!this.analysisResponse) {
      return [];
    }

    return this.analysisResponse.segmentos.filter((segmento) => segmento.orden === themeOrder);
  }
}
