import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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
    >
      <nav header-breadcrumbs aria-label="breadcrumb" class="page-header-breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <a routerLink="/dashboard" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">home</span>
              Inicio
            </a>
          </li>
          <li class="breadcrumb-item">
            <a routerLink="/trainings_programs" class="d-inline-flex align-items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">school</span>
              Capacitaciones
            </a>
          </li>
          <li class="breadcrumb-item active d-inline-flex align-items-center gap-1" aria-current="page">
            <span class="material-symbols-outlined text-[15px]">smart_display</span>
            Video Index Action
          </li>
        </ol>
      </nav>
    </app-page-header>

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

    <div *ngIf="!loading && !loadingTrainingDetail && currentTraining && currentMaterial" class="d-flex flex-column gap-4">
      <div class="card glass-card border-0 rounded-4 overflow-hidden">
        <div class="p-3 p-md-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
            <div>
              <h2 class="text-on-surface mb-1">Video</h2>
              <div class="text-on-surface-variant font-body-md">
                {{ currentMaterial.filename }}
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <span class="badge rounded-pill text-bg-primary">Tiempo {{ formatTime(currentVideoTime) }}</span>
              <span *ngIf="currentVideoDuration > 0" class="badge rounded-pill text-bg-secondary">
                Duracion {{ formatTime(currentVideoDuration) }}
              </span>
              <span *ngIf="currentTheme" class="badge rounded-pill text-bg-info text-dark">
                Tema {{ currentTheme.orden }}
              </span>
            </div>

            <div class="d-flex flex-wrap justify-content-md-end gap-2 mt-3">
              <button
                type="button"
                class="btn btn-sm fw-semibold d-inline-flex align-items-center gap-1 px-3 py-2 border-2"
                [class.btn-primary]="subtitlesEnabled && !!currentSubtitleUrl"
                [class.btn-outline-primary]="!(subtitlesEnabled && !!currentSubtitleUrl)"
                (click)="toggleSubtitles()"
              >
                <span class="material-symbols-outlined text-[16px]">
                  {{ subtitlesEnabled ? 'subtitles' : 'subtitles_off' }}
                </span>
                {{ subtitlesEnabled ? 'Subtítulos activos' : 'Subtítulos apagados' }}
              </button>

              <button
                type="button"
                class="btn btn-sm fw-semibold d-inline-flex align-items-center gap-1 px-3 py-2 border-2 btn-outline-secondary"
                (click)="toggleFullscreen()"
              >
                <span class="material-symbols-outlined text-[16px]">
                  {{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}
                </span>
                {{ isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa' }}
              </button>
            </div>
          </div>

          <div #videoStage class="video-stage">
            <div class="ratio ratio-16x9 rounded-4 overflow-hidden bg-black">
              <video
                #videoPlayer
                *ngIf="isVideoMime(currentMaterial)"
                [src]="currentVideoUrl"
                controls
                playsinline
                preload="auto"
                controlsList="nofullscreen"
                disablePictureInPicture
                class="w-100 h-100"
                (loadedmetadata)="onVideoLoadedMetadata($event)"
                (timeupdate)="onVideoTimeUpdate($event)"
                (seeked)="onVideoTimeUpdate($event)"
              >
                <track
                  *ngIf="currentSubtitleUrl"
                  kind="subtitles"
                  srclang="es"
                  label="Español"
                  [src]="currentSubtitleUrl"
                />
                Tu navegador no soporta reproduccion de video.
              </video>

              <iframe
                *ngIf="!isVideoMime(currentMaterial)"
                [src]="currentVideoUrl"
                class="w-100 h-100 border-0"
                title="Material de capacitacion"
              ></iframe>
            </div>

            <div
              *ngIf="isVideoMime(currentMaterial) && subtitlesEnabled && currentSubtitleText"
              class="yt-subtitle-overlay"
            >
              {{ currentSubtitleText }}
            </div>
          </div>
        </div>
      </div>

      <div class="card glass-card border-0 rounded-4 p-4">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
          <div>
            <h2 class="text-on-surface mb-1">Indexacion</h2>
            <div class="text-on-surface-variant font-body-md">
              Extrae, analiza o limpia la indexacion guardada de la capacitacion seleccionada.
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
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
              [disabled]="analyzingAudio"
              (click)="indexAudio()"
            >
              <span class="material-symbols-outlined text-[18px]">psychology</span>
              {{ analyzingAudio ? 'Indexando...' : 'Indexar MP3' }}
            </button>

            <button
              type="button"
              class="btn btn-outline-danger fw-semibold d-inline-flex align-items-center justify-content-center gap-2"
              [disabled]="clearingIndexation"
              (click)="clearIndexation()"
            >
              <span class="material-symbols-outlined text-[18px]">delete_forever</span>
              {{ clearingIndexation ? 'Limpiando...' : 'Limpiar indexacion' }}
            </button>
          </div>
        </div>

        <div *ngIf="extractErrorMessage" class="alert alert-danger mb-3">
          {{ extractErrorMessage }}
        </div>

        <div *ngIf="analysisErrorMessage" class="alert alert-danger mb-3">
          {{ analysisErrorMessage }}
        </div>

        <div *ngIf="extractedAudio" class="card border-0 rounded-4 bg-body-tertiary mb-3">
          <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div class="d-flex flex-column gap-1">
              <div class="text-on-surface font-body-md fw-semibold">Audio extraido</div>
              <div class="text-on-surface-variant small">
                {{ extractedAudio.audio.original_name }}
              </div>
            </div>

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

      <div class="card glass-card border-0 rounded-4 p-4">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-3">
          <div>
            <h2 class="text-on-surface mb-1">Contenido sincronizado</h2>
            <div class="text-on-surface-variant font-body-md">
              La indexacion se actualiza automaticamente segun la posicion del video.
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <span class="badge rounded-pill text-bg-secondary">Tiempo {{ formatTime(currentVideoTime) }}</span>
            <span *ngIf="currentTheme" class="badge rounded-pill text-bg-info text-dark">
              Tema {{ currentTheme.orden }}: {{ currentTheme.tema }}
            </span>
            <span *ngIf="activeSegment" class="badge rounded-pill text-bg-success">
              Segmento #{{ activeSegment.orden }}
            </span>
          </div>
        </div>

        <div *ngIf="analysisResponse; else noIndexationState" class="d-flex flex-column gap-4">
          <div class="card border-0 rounded-4 bg-body-tertiary">
            <div class="card-body">
              <div class="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
                <div>
                  <div class="text-on-surface-variant small">Tema actual</div>
                  <div class="text-on-surface fw-semibold fs-5">
                    {{ currentTheme?.tema ?? 'Sin tema activo' }}
                  </div>
                  <div class="text-on-surface-variant small">
                    {{ currentTheme ? (currentTheme.inicio + 's - ' + currentTheme.fin + 's') : 'No determinado' }}
                  </div>
                </div>

                <div class="text-xl-end">
                  <div class="text-on-surface-variant small">Resumen del tramo activo</div>
                  <div class="text-on-surface fw-semibold">
                    {{ activeSegment?.resumen ?? analysisResponse.resumen_general }}
                  </div>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-12 col-lg-7">
                  <div class="text-on-surface-variant small mb-1">Texto del tramo actual</div>
                  <div class="text-on-surface">
                    {{ activeSegment?.texto ?? analysisResponse.resumen_general }}
                  </div>
                </div>

                <div class="col-12 col-lg-5">
                  <div class="text-on-surface-variant small mb-2">Palabras clave</div>
                  <div class="d-flex flex-wrap gap-2">
                    <span
                      *ngFor="let palabra of activeSegment?.palabras_clave ?? []"
                      class="badge text-bg-secondary"
                    >
                      {{ palabra }}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div>
            <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
              <div class="text-on-surface fw-semibold">Temas detectados</div>
              <div class="text-on-surface-variant small">
                {{ currentTheme ? 'Mostrando el tema activo' : 'Sin coincidencia de tiempo' }}
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2 mb-3">
              <button
                *ngFor="let tema of analysisResponse.temas_detectados; let i = index"
                type="button"
                class="btn btn-sm"
                [class.btn-primary]="selectedTemaIndex === i"
                [class.btn-outline-primary]="selectedTemaIndex !== i"
                (click)="selectedTemaIndex = i"
              >
                {{ tema.orden }}. {{ tema.tema }}
              </button>
            </div>

            <div class="row g-3">
              <div
                *ngFor="let segmento of getSegmentsForTheme(currentTheme?.orden ?? analysisResponse.temas_detectados[selectedTemaIndex]?.orden ?? 0); let i = index"
                class="col-12"
              >
                <div class="card border-0 rounded-4"
                     [class.bg-primary-subtle]="isActiveSegment(segmento)"
                     [class.border]="isActiveSegment(segmento)"
                     [class.border-primary]="isActiveSegment(segmento)"
                     [class.bg-body-tertiary]="!isActiveSegment(segmento)">
                  <div class="card-body">
                    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
              <div class="d-flex flex-wrap align-items-center gap-2">
                        <span class="badge text-bg-primary">#{{ segmento.orden }}</span>
                        <span class="text-on-surface fw-semibold">{{ segmento.tema }}</span>
                        <span class="badge text-bg-secondary">{{ segmento.inicio }}s - {{ segmento.fin }}s</span>
                      </div>

                      <div class="text-on-surface-variant small">
                        {{ isActiveSegment(segmento) ? 'Segmento activo' : 'Segmento programado' }}
                      </div>
                    </div>

                    <div class="row g-3">
                      <div class="col-12 col-lg-4">
                        <div class="text-on-surface-variant small">Subtema</div>
                        <div class="text-on-surface fw-semibold">{{ segmento.subtema || 'No determinado' }}</div>
                      </div>

                      <div class="col-12 col-lg-8">
                        <div class="text-on-surface-variant small">Resumen</div>
                        <div class="text-on-surface">{{ segmento.resumen }}</div>
                      </div>

                      <div class="col-12">
                        <div class="text-on-surface-variant small mb-1">Texto</div>
                        <div class="text-on-surface">{{ segmento.texto }}</div>
                      </div>

                      <div class="col-12 col-lg-6">
                        <div class="text-on-surface-variant small mb-2">Palabras clave</div>
                        <div class="d-flex flex-wrap gap-2">
                          <span *ngFor="let palabra of segmento.palabras_clave" class="badge text-bg-secondary">
                            {{ palabra }}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="currentTheme" class="card border-0 rounded-4 bg-body-tertiary">
            <div class="card-body">
              <div class="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3 mb-3">
                <div>
                  <div class="text-on-surface-variant small">Preguntas del tema actual</div>
                  <div class="text-on-surface fw-semibold fs-5">
                    {{ currentTheme.tema }}
                  </div>
                  <div class="text-on-surface-variant small">
                    Asocia una o varias preguntas al tema que esta activo en la linea de tiempo.
                  </div>
                </div>

                <div class="d-flex flex-wrap gap-2">
                  <span class="badge rounded-pill text-bg-secondary">
                    {{ getSelectedQuestionIdsForTheme(currentTheme.orden).length }} seleccionadas
                  </span>
                  <button
                    type="button"
                    class="btn btn-sm btn-primary fw-semibold d-inline-flex align-items-center gap-1"
                    [disabled]="savingQuestionAssignments || !currentTraining || !currentTheme"
                    (click)="saveCurrentThemeQuestionAssignments()"
                  >
                    <span class="material-symbols-outlined text-[16px]">save</span>
                    {{ savingQuestionAssignments ? 'Guardando...' : 'Guardar preguntas del tema' }}
                  </button>
                </div>
              </div>

              <div *ngIf="questionAssignmentMessage" class="alert alert-success mb-3">
                {{ questionAssignmentMessage }}
              </div>

              <div *ngIf="questionAssignmentError" class="alert alert-danger mb-3">
                {{ questionAssignmentError }}
              </div>

              <div *ngIf="currentTraining.questions?.length; else noQuestionsTemplate" class="row g-3">
                <div class="col-12 col-xl-7">
                  <div class="text-on-surface-variant small mb-2">Selecciona las preguntas</div>
                  <div class="d-flex flex-column gap-2">
                    <label
                      *ngFor="let question of currentTraining.questions"
                      class="d-flex align-items-start gap-3 p-3 rounded-3 border border-white/10 bg-body"
                    >
                      <input
                        type="checkbox"
                        class="form-check-input mt-1"
                        [checked]="isQuestionAssignedToTheme(currentTheme.orden, question.id)"
                        (change)="toggleQuestionForCurrentTheme(question.id, $any($event.target).checked)"
                      />
                      <div class="flex-grow-1">
                        <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <span class="text-on-surface fw-semibold">{{ question.question_text }}</span>
                          <span class="badge rounded-pill text-bg-secondary">{{ question.type }}</span>
                        </div>
                        <div class="text-on-surface-variant small">Orden {{ question.order }}</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="col-12 col-xl-5">
                  <div class="text-on-surface-variant small mb-2">Preguntas asociadas</div>
                  <div *ngIf="getQuestionsAssignedToTheme(currentTheme.orden).length > 0; else emptyThemeQuestions" class="d-flex flex-column gap-2">
                    <div
                      *ngFor="let question of getQuestionsAssignedToTheme(currentTheme.orden)"
                      class="p-3 rounded-3 border border-success-subtle bg-success-subtle"
                    >
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <div class="text-on-surface fw-semibold">{{ question.question_text }}</div>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          (click)="toggleQuestionForCurrentTheme(question.id, false)"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                  <ng-template #emptyThemeQuestions>
                    <div class="text-on-surface-variant small">
                      Todavia no hay preguntas asociadas a este tema.
                    </div>
                  </ng-template>
                </div>
              </div>

              <ng-template #noQuestionsTemplate>
                <div class="text-on-surface-variant font-body-md">
                  Esta capacitacion no tiene preguntas creadas todavia.
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <ng-template #noIndexationState>
          <div class="text-on-surface-variant font-body-md">
            Todavia no hay una indexacion cargada para esta capacitacion.
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      .yt-subtitle-overlay {
        position: absolute;
        left: 50%;
        bottom: 0.8rem;
        transform: translateX(-50%);
        width: fit-content;
        max-width: min(78%, 34rem);
        padding: 0.28rem 0.6rem;
        border-radius: 0.45rem;
        background: rgba(0, 0, 0, 0.58);
        color: #fff;
        text-align: center;
        font-size: 0.88rem;
        line-height: 1.18;
        font-weight: 700;
        white-space: normal;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        pointer-events: none;
        z-index: 2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .video-stage {
        position: relative;
      }
    `
  ]
})
export class VideoIndexActionComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly videoIndexActionService = inject(VideoIndexActionService);
  @ViewChild('videoPlayer') private videoPlayer?: ElementRef<HTMLVideoElement>;
  @ViewChild('videoStage') private videoStage?: ElementRef<HTMLElement>;

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
  currentSubtitleUrl: string | null = null;
  extractingAudio = false;
  extractErrorMessage = '';
  analyzingAudio = false;
  analysisErrorMessage = '';
  clearingIndexation = false;
  savingQuestionAssignments = false;
  selectedTemaIndex = 0;
  subtitlesEnabled = true;
  isFullscreen = false;
  currentVideoTime = 0;
  currentVideoDuration = 0;
  activeSegment: VideoIndexAnalysisResponse['segmentos'][number] | null = null;
  questionAssignments: Record<number, number[]> = {};
  questionAssignmentMessage = '';
  questionAssignmentError = '';

  ngOnInit(): void {
    const initialTrainingId = Number(this.route.snapshot.queryParamMap.get('training') ?? 0) || null;
    const initialMaterialId = Number(this.route.snapshot.queryParamMap.get('material') ?? 0) || null;

    this.loadTrainings(initialTrainingId, initialMaterialId);
  }

  ngAfterViewInit(): void {
    this.applySubtitleTrackMode();
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
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

  get currentTheme(): VideoIndexAnalysisResponse['temas_detectados'][number] | null {
    if (!this.analysisResponse || this.analysisResponse.temas_detectados.length === 0) {
      return null;
    }

    return this.analysisResponse.temas_detectados[this.selectedTemaIndex] ?? this.analysisResponse.temas_detectados[0] ?? null;
  }

  get currentSubtitleCue(): NonNullable<VideoIndexAnalysisResponse['subtitle_cues']>[number] | null {
    const cues = this.analysisResponse?.subtitle_cues ?? [];

    if (cues.length === 0) {
      return null;
    }

    const orderedCues = [...cues].sort((left, right) => {
      if (left.inicio !== right.inicio) {
        return left.inicio - right.inicio;
      }

      if (left.fin !== right.fin) {
        return left.fin - right.fin;
      }

      return left.orden - right.orden;
    });

    const exactCue = orderedCues.find((cue) => this.currentVideoTime >= cue.inicio && this.currentVideoTime < cue.fin);
    if (exactCue) {
      return exactCue;
    }

    const previousCue = [...orderedCues].reverse().find((cue) => cue.inicio <= this.currentVideoTime);
    return previousCue ?? orderedCues[0] ?? null;
  }

  get currentSubtitleText(): string {
    return (
      this.currentSubtitleCue?.texto?.trim() ||
      this.activeSegment?.texto?.trim() ||
      this.activeSegment?.resumen?.trim() ||
      ''
    );
  }

  getSelectedQuestionIdsForTheme(themeOrder: number): number[] {
    return this.questionAssignments[themeOrder] ?? [];
  }

  isQuestionAssignedToTheme(themeOrder: number, questionId: number): boolean {
    return this.getSelectedQuestionIdsForTheme(themeOrder).includes(questionId);
  }

  getQuestionsAssignedToTheme(themeOrder: number) {
    const questions = this.currentTraining?.questions ?? [];
    const selectedIds = new Set(this.getSelectedQuestionIdsForTheme(themeOrder));

    return questions.filter((question) => selectedIds.has(question.id));
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

  onVideoLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement | null;

    if (!video) {
      return;
    }

    this.syncPlaybackState(video.currentTime, video.duration);
    this.applySubtitleTrackMode();
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement | null;

    if (!video) {
      return;
    }

    this.syncPlaybackState(video.currentTime, video.duration);
  }

  toggleSubtitles(): void {
    this.subtitlesEnabled = !this.subtitlesEnabled;
    this.applySubtitleTrackMode();
  }

  async toggleFullscreen(): Promise<void> {
    const stage = this.videoStage?.nativeElement;

    if (!stage) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await stage.requestFullscreen();
  }

  private getVideoMaterials(training: Training): TrainingMaterial[] {
    return (training.materials ?? []).filter((material) => this.isVideoMime(material));
  }

  private applySubtitleTrackMode(): void {
    const video = this.videoPlayer?.nativeElement;

    if (!video) {
      return;
    }

    const track = video.textTracks[0];
    if (!track) {
      return;
    }

    track.mode = this.currentSubtitleUrl && this.subtitlesEnabled ? 'showing' : 'hidden';
  }

  private readonly handleFullscreenChange = (): void => {
    this.isFullscreen = document.fullscreenElement === this.videoStage?.nativeElement;
  };

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
          this.currentVideoTime = 0;
          this.currentVideoDuration = 0;
          this.activeSegment = null;
          this.subtitlesEnabled = true;
          this.questionAssignments = {};
          this.questionAssignmentMessage = '';
          this.questionAssignmentError = '';
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
    this.currentSubtitleUrl = null;
    this.subtitlesEnabled = true;
    this.analysisErrorMessage = '';
    this.extractedAudio = null;
    this.extractedAudioUrl = null;
    this.questionAssignments = {};
    this.questionAssignmentMessage = '';
    this.questionAssignmentError = '';

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
    this.questionAssignments = {};

    this.loadingService
      .track(this.videoIndexActionService.analyzeAudio(this.selectedTrainingId, audioPath))
      .pipe(finalize(() => (this.analyzingAudio = false)))
      .subscribe({
        next: (response) => {
          this.analysisResponse = response;
          this.currentSubtitleUrl = response.subtitle_url ?? null;
          this.questionAssignments = this.normalizeQuestionAssignments(response.question_assignments ?? []);
          this.subtitlesEnabled = true;
          this.syncPlaybackState(this.currentVideoTime, this.currentVideoDuration);
          this.applySubtitleTrackMode();
        },
        error: (error) => {
          this.analysisErrorMessage = error?.error?.details
            ? `${error?.error?.message || 'No fue posible indexar el audio.'} ${error.error.details}`
            : (error?.error?.message || 'No fue posible indexar el audio.');
        }
      });
  }

  clearIndexation(): void {
    if (this.selectedTrainingId === null) {
      return;
    }

    if (!this.hasStoredIndexation()) {
      this.analysisErrorMessage = 'Todavia no hay una indexacion guardada para limpiar.';
      return;
    }

    if (!window.confirm('Eliminar la indexacion guardada de esta capacitacion?')) {
      return;
    }

    this.clearingIndexation = true;
    this.analysisErrorMessage = '';
    this.extractErrorMessage = '';

    this.loadingService
      .track(this.videoIndexActionService.clearIndexation(this.selectedTrainingId))
      .pipe(finalize(() => (this.clearingIndexation = false)))
      .subscribe({
        next: () => {
          this.analysisResponse = null;
          this.extractedAudio = null;
          this.extractedAudioUrl = null;
          this.currentSubtitleUrl = null;
          this.subtitlesEnabled = true;
          this.selectedTemaIndex = 0;
          this.activeSegment = null;
          this.questionAssignments = {};
          this.questionAssignmentMessage = '';
          this.questionAssignmentError = '';
        },
        error: (error) => {
          this.analysisErrorMessage = error?.error?.message || 'No fue posible limpiar la indexacion.';
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
    this.currentSubtitleUrl = null;
    this.subtitlesEnabled = true;
    this.extractingAudio = false;
    this.extractErrorMessage = '';
    this.analyzingAudio = false;
    this.analysisErrorMessage = '';
    this.activeSegment = null;
    this.selectedTemaIndex = 0;
    this.currentVideoTime = 0;
    this.currentVideoDuration = 0;
    this.questionAssignments = {};
    this.questionAssignmentMessage = '';
    this.questionAssignmentError = '';
  }

  private loadStoredIndexation(trainingId: number): void {
    this.videoIndexActionService.getIndexation(trainingId).subscribe({
      next: (response: VideoIndexStoredResponse) => {
        this.analysisResponse = response.result_data
          ? {
              ...response.result_data,
              subtitle_cues: response.subtitle_cues ?? response.result_data.subtitle_cues,
              question_assignments: response.question_assignments ?? response.result_data.question_assignments
            }
          : null;
        this.currentSubtitleUrl = response.subtitle_url ?? null;
        this.questionAssignments = this.normalizeQuestionAssignments(response.question_assignments ?? response.result_data?.question_assignments ?? []);
        this.subtitlesEnabled = true;
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

        this.syncPlaybackState(this.currentVideoTime, this.currentVideoDuration);
        this.applySubtitleTrackMode();
      },
      error: () => {
        this.analysisResponse = null;
      }
      });
  }

  hasStoredIndexation(): boolean {
    return !!this.analysisResponse || !!this.extractedAudio?.audio?.path;
  }

  getSegmentsForTheme(themeOrder: number): VideoIndexAnalysisResponse['segmentos'] {
    if (!this.analysisResponse) {
      return [];
    }

    return this.analysisResponse.segmentos.filter((segmento) => segmento.orden === themeOrder);
  }

  isActiveSegment(segmento: VideoIndexAnalysisResponse['segmentos'][number]): boolean {
    if (!this.activeSegment) {
      return false;
    }

    return (
      this.activeSegment.orden === segmento.orden &&
      this.activeSegment.inicio === segmento.inicio &&
      this.activeSegment.fin === segmento.fin
    );
  }

  formatTime(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
      return '00:00';
    }

    const roundedSeconds = Math.floor(totalSeconds);
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const seconds = roundedSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  toggleQuestionForCurrentTheme(questionId: number, checked: boolean): void {
    if (!this.currentTheme) {
      return;
    }

    const themeOrder = this.currentTheme.orden;
    const currentIds = new Set(this.getSelectedQuestionIdsForTheme(themeOrder));

    if (checked) {
      currentIds.add(questionId);
    } else {
      currentIds.delete(questionId);
    }

    this.questionAssignments = {
      ...this.questionAssignments,
      [themeOrder]: Array.from(currentIds)
    };
  }

  saveCurrentThemeQuestionAssignments(): void {
    if (!this.currentTheme || this.selectedTrainingId === null) {
      return;
    }

    const themeOrder = this.currentTheme.orden;
    const questionIds = this.getSelectedQuestionIdsForTheme(themeOrder);

    this.savingQuestionAssignments = true;
    this.questionAssignmentError = '';
    this.questionAssignmentMessage = '';

    this.loadingService
      .track(this.videoIndexActionService.saveQuestionAssignments(this.selectedTrainingId, themeOrder, questionIds))
      .pipe(finalize(() => (this.savingQuestionAssignments = false)))
      .subscribe({
        next: (response) => {
          this.questionAssignments = this.normalizeQuestionAssignments(response.question_assignments ?? []);
          this.questionAssignmentMessage = response.message || 'Preguntas asociadas correctamente.';
        },
        error: (error) => {
          this.questionAssignmentError = error?.error?.message || 'No fue posible guardar las preguntas del tema.';
        }
      });
  }

  private normalizeQuestionAssignments(
    assignments: NonNullable<VideoIndexAnalysisResponse['question_assignments']>
  ): Record<number, number[]> {
    return assignments.reduce<Record<number, number[]>>((carry, item) => {
      const themeOrder = Number(item.theme_order);
      if (!Number.isFinite(themeOrder) || themeOrder <= 0) {
        return carry;
      }

      carry[themeOrder] = Array.from(new Set((item.question_ids ?? []).map((questionId) => Number(questionId)).filter((questionId) => Number.isFinite(questionId))));
      return carry;
    }, {});
  }

  private syncPlaybackState(currentTime: number, duration: number): void {
    this.currentVideoTime = Number.isFinite(currentTime) ? currentTime : 0;
    this.currentVideoDuration = Number.isFinite(duration) && duration > 0 ? duration : this.currentVideoDuration;

    if (!this.analysisResponse) {
      return;
    }

    const segment = this.getSegmentForTime(this.currentVideoTime);
    this.activeSegment = segment;

    const theme = this.getThemeForTime(this.currentVideoTime, segment);
    if (theme) {
      const themeIndex = this.analysisResponse.temas_detectados.findIndex((item) => item.orden === theme.orden);

      if (themeIndex >= 0) {
        this.selectedTemaIndex = themeIndex;
      }
    }
  }

  private getSegmentForTime(currentTime: number): VideoIndexAnalysisResponse['segmentos'][number] | null {
    if (!this.analysisResponse || this.analysisResponse.segmentos.length === 0) {
      return null;
    }

    const segments = [...this.analysisResponse.segmentos].sort((left, right) => {
      if (left.inicio !== right.inicio) {
        return left.inicio - right.inicio;
      }

      if (left.fin !== right.fin) {
        return left.fin - right.fin;
      }

      return left.orden - right.orden;
    });

    const exactSegment = segments.find((segment) => currentTime >= segment.inicio && currentTime < segment.fin);
    if (exactSegment) {
      return exactSegment;
    }

    const previousSegment = [...segments].reverse().find((segment) => segment.inicio <= currentTime);
    return previousSegment ?? segments[0] ?? null;
  }

  private getThemeForTime(
    currentTime: number,
    segment: VideoIndexAnalysisResponse['segmentos'][number] | null
  ): VideoIndexAnalysisResponse['temas_detectados'][number] | null {
    if (!this.analysisResponse || this.analysisResponse.temas_detectados.length === 0) {
      return null;
    }

    if (segment) {
      return this.analysisResponse.temas_detectados.find((tema) => tema.orden === segment.orden) ?? null;
    }

    const themes = [...this.analysisResponse.temas_detectados].sort((left, right) => {
      if (left.inicio !== right.inicio) {
        return left.inicio - right.inicio;
      }

      return left.fin - right.fin;
    });

    const exactTheme = themes.find((tema) => currentTime >= tema.inicio && currentTime < tema.fin);
    if (exactTheme) {
      return exactTheme;
    }

    const previousTheme = [...themes].reverse().find((tema) => tema.inicio <= currentTime);
    return previousTheme ?? themes[0] ?? null;
  }
}
