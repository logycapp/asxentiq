import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import {
  Question,
  SubmitAnswer,
  Training,
  TrainingAudioIndexation,
  TrainingAudioIndexationTheme,
  TrainingService,
  VideoIndexAnalysisResponse
} from '../../core/services/training.service';

interface GuidedTheme {
  orden: number;
  tema: string;
  inicio: number;
  fin: number;
}

interface GuidedQuestionAssignment {
  id?: number;
  training_audio_indexation_id?: number;
  question_id?: number;
  theme_order: number;
  sort_order?: number;
  question?: Question;
  question_ids?: number[];
}

@Component({
  selector: 'app-public-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="public-exam-shell">
      <div class="public-exam-backdrop"></div>
      <div class="public-exam-orb public-exam-orb-a"></div>
      <div class="public-exam-orb public-exam-orb-b"></div>

      <div class="container public-exam-container py-4 py-xl-5">
        <div *ngIf="loading" class="public-exam-loading">
          <div class="spinner-border text-info" role="status"></div>
          <p class="mb-0 mt-3">Cargando examen...</p>
        </div>

        <div *ngIf="error" class="alert alert-danger public-exam-alert">{{ error }}</div>

        <div *ngIf="training && step === 'material'" class="public-exam-card mb-4">
          <div class="public-exam-hero">
            <div class="public-exam-hero-copy">
              <div class="public-exam-kicker">Material de estudio</div>
              <h1 class="public-exam-title mb-2">{{ training.title }}</h1>
              <p class="public-exam-subtitle mb-0">
                Revisa el material antes de comenzar. Los videos y PDF se muestran directamente para una experiencia más fluida.
              </p>
            </div>
            <div class="public-exam-hero-stats">
              <div class="public-exam-stat">
                <span class="material-symbols-outlined">description</span>
                <div>
                  <div class="public-exam-stat-label">Materiales</div>
                  <div class="public-exam-stat-value">{{ training.materials?.length || 0 }}</div>
                </div>
              </div>
              <div class="public-exam-stat">
                <span class="material-symbols-outlined">quiz</span>
                <div>
                  <div class="public-exam-stat-label">Preguntas</div>
                  <div class="public-exam-stat-value">{{ totalQuestions() }}</div>
                </div>
              </div>
              <button
                *ngIf="training.materials && training.materials.length > 0 && !training.material_with_indexation"
                class="btn public-exam-hero-action public-exam-hero-action-blink"
                (click)="startExam()"
              >
                {{ training.attempt_in_progress || hasStartedExam(training.id) ? 'Continuar examen' : 'Comenzar examen' }}
              </button>
              <button
                *ngIf="!training.materials || training.materials.length === 0"
                class="btn public-exam-primary-btn public-exam-hero-action"
                (click)="startExam()"
              >
                Iniciar ahora
              </button>
            </div>
          </div>

          <div class="public-exam-body">
            <div *ngIf="training.materials && training.materials.length > 0; else noMaterialTemplate" class="public-exam-material-grid">
              <article *ngFor="let m of training.materials" class="public-exam-material-card">
                <div class="public-exam-material-header">
                  <div>
                    <div class="public-exam-material-kicker">{{ materialKindLabel(m) }}</div>
                    <h3 class="public-exam-material-title mb-0">{{ m.filename }}</h3>
                  </div>
                  <span class="badge rounded-pill public-exam-material-badge">{{ materialTypeText(m) }}</span>
                </div>

                <div class="public-exam-material-preview">
                  <ng-container *ngIf="isVideoMaterial(m); else pdfOrFileTemplate">
                    <div class="public-exam-media-stage">
                      <video
                        #previewVideo
                        class="public-exam-media"
                        controls
                        playsinline
                        preload="metadata"
                        [attr.poster]="materialPoster(m)"
                        (loadedmetadata)="onPreviewVideoLoadedMetadata($event)"
                        (timeupdate)="onPreviewVideoTimeUpdate($event)"
                      >
                        <track
                          *ngIf="currentSubtitleUrl"
                          kind="subtitles"
                          srclang="es"
                          label="Español"
                          [src]="currentSubtitleUrl"
                        />
                        <source [src]="materialUrl(m)" [attr.type]="m.mime_type || 'video/mp4'" />
                        Tu navegador no soporta el video.
                      </video>
                      <div *ngIf="currentGuidedSubtitleText && training.material_with_indexation" class="public-exam-guided-subtitle-overlay public-exam-preview-subtitle-overlay">
                        {{ currentGuidedSubtitleText }}
                      </div>
                      <button type="button" class="btn public-exam-media-fullscreen-btn" (click)="toggleFullscreen(previewVideo)">
                        <span class="material-symbols-outlined text-[16px]">fullscreen</span>
                        Pantalla completa
                      </button>
                    </div>
                  </ng-container>

                  <ng-template #pdfOrFileTemplate>
                    <ng-container *ngIf="isPdfMaterial(m); else fallbackMaterialTemplate">
                      <iframe
                        class="public-exam-media public-exam-pdf"
                        [src]="materialUrl(m)"
                        title="Material PDF"
                        loading="lazy"
                      ></iframe>
                    </ng-container>
                  </ng-template>

                  <ng-template #fallbackMaterialTemplate>
                    <div class="public-exam-fallback">
                      <span class="material-symbols-outlined">attach_file</span>
                      <p class="mb-0">Este archivo no tiene vista previa embebida.</p>
                      <a [href]="materialUrl(m)" target="_blank" rel="noopener" class="btn public-exam-outline-btn">
                        Abrir archivo
                      </a>
                    </div>
                  </ng-template>
                </div>
              </article>
            </div>

            <ng-template #noMaterialTemplate>
              <div class="public-exam-empty-state">
                <span class="material-symbols-outlined">check_circle</span>
                <h3 class="mb-2">No hay material previo</h3>
                <p class="mb-0">Puedes comenzar el examen de inmediato porque esta capacitación no incluye material adicional.</p>
              </div>
            </ng-template>
          </div>
        </div>

        <div *ngIf="step === 'exam' && training && !isGuidedIndexationMode()" class="public-exam-card">
          <div class="public-exam-hero public-exam-hero-exam">
            <div class="public-exam-hero-copy">
              <div class="public-exam-kicker">Evaluacion activa</div>
              <h2 class="public-exam-title mb-2">{{ training.title }}</h2>
              <p class="public-exam-subtitle mb-0">Responde una pregunta a la vez. Usa los botones inferiores para avanzar con tranquilidad.</p>
            </div>
            <div class="public-exam-progress-pill">
              <span class="material-symbols-outlined">radio_button_checked</span>
              <span>{{ currentQuestionNumber() }} / {{ totalQuestions() }}</span>
            </div>
          </div>

          <div class="public-exam-body">
            <div *ngIf="resultMessage" class="alert public-exam-alert public-exam-alert-danger">{{ resultMessage }}</div>

            <div *ngIf="currentQuestion() as q" class="public-exam-question-card">
              <div class="public-exam-question-header">
                <div>
                  <div class="public-exam-question-kicker">Pregunta {{ currentQuestionNumber() }}</div>
                  <h3 class="public-exam-question-title mb-0">{{ q.question_text }}</h3>
                </div>
                <span class="public-exam-question-badge">{{ questionTypeLabel(q.type) }}</span>
              </div>

              <div *ngIf="q.materials && q.materials.length > 0" class="public-exam-question-materials">
                <div class="public-exam-section-label">Material de apoyo</div>
                <div class="public-exam-question-material-grid">
                  <article *ngFor="let m of q.materials" class="public-exam-question-material-card">
                    <div class="public-exam-question-material-meta">
                      <span class="public-exam-question-material-icon">
                        <span class="material-symbols-outlined">auto_stories</span>
                      </span>
                      <div>
                        <div class="public-exam-question-material-name">{{ m.filename }}</div>
                        <div class="public-exam-question-material-type">{{ materialTypeText(m) }}</div>
                      </div>
                    </div>

                    <ng-container *ngIf="isVideoMaterial(m); else questionPdfOrFileTemplate">
                      <video class="public-exam-question-media" controls playsinline preload="metadata">
                        <source [src]="materialUrl(m)" [attr.type]="m.mime_type || 'video/mp4'" />
                      </video>
                    </ng-container>

                    <ng-template #questionPdfOrFileTemplate>
                      <ng-container *ngIf="isPdfMaterial(m); else questionFallbackTemplate">
                        <iframe class="public-exam-question-media public-exam-pdf" [src]="materialUrl(m)" title="Material PDF"></iframe>
                      </ng-container>
                    </ng-template>

                    <ng-template #questionFallbackTemplate>
                      <a [href]="materialUrl(m)" target="_blank" rel="noopener" class="btn public-exam-outline-btn w-100">
                        Abrir archivo
                      </a>
                    </ng-template>
                  </article>
                </div>
              </div>

              <div class="public-exam-answer-block">
                <div class="public-exam-section-label">Tu respuesta</div>

                <!-- Open question -->
                <div *ngIf="q.type === 'open'">
                  <textarea
                    class="form-control public-exam-textarea"
                    rows="5"
                    [(ngModel)]="answers[q.id]"
                    placeholder="Escriba su respuesta..."
                  ></textarea>
                </div>

                <!-- Yes/No -->
                <div *ngIf="q.type === 'yes_no'" class="public-exam-option-list">
                  <label class="public-exam-option">
                    <input class="form-check-input" type="radio" [name]="'q_' + q.id" [value]="'yes'" (change)="selectOption(q, 'yes')" />
                    <span>Si</span>
                  </label>
                  <label class="public-exam-option">
                    <input class="form-check-input" type="radio" [name]="'q_' + q.id" [value]="'no'" (change)="selectOption(q, 'no')" />
                    <span>No</span>
                  </label>
                </div>

                <!-- Multiple choice -->
                <div *ngIf="q.type === 'multiple_choice' && q.options" class="public-exam-option-list">
                  <label *ngFor="let opt of q.options" class="public-exam-option public-exam-option-choice">
                    <input class="form-check-input" type="radio" [name]="'q_' + q.id" [value]="opt.id" [(ngModel)]="answers[q.id]" />
                    <span>{{ opt.option_text }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="public-exam-actions mt-4">
              <button class="btn public-exam-nav-btn" (click)="previousQuestion()" [disabled]="submitting || isFirstQuestion()">
                Anterior
              </button>

              <div class="public-exam-counter">
                <span>Pregunta</span>
                <strong>{{ currentQuestionNumber() }} / {{ totalQuestions() }}</strong>
              </div>

              <button class="btn public-exam-primary-btn" (click)="nextOrFinish()" [disabled]="submitting">
                <span *ngIf="submitting" class="spinner-border spinner-border-sm me-2"></span>
                {{ isLastQuestion() ? 'Finalizar' : 'Siguiente' }}
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="step === 'exam' && training && isGuidedIndexationMode()" class="public-exam-card">
          <div class="public-exam-hero public-exam-hero-exam">
            <div class="public-exam-hero-copy">
              <div class="public-exam-kicker">Material con indexacion</div>
              <h2 class="public-exam-title mb-2">{{ training.title }}</h2>
              <p class="public-exam-subtitle mb-0">
                Reproduce el video. Cuando termine un tema, se pausara para responder las preguntas asociadas y luego continuara.
              </p>
            </div>
          </div>

          <div class="public-exam-body">
            <div class="public-exam-guided-layout">
              <div #guidedStage class="public-exam-guided-video-card public-exam-guided-stage">
                <video
                  #guidedVideo
                  class="public-exam-media public-exam-guided-video"
                  playsinline
                  preload="metadata"
                  [src]="guidedVideoUrl()"
                  (loadedmetadata)="onGuidedVideoLoadedMetadata($event)"
                  (play)="onGuidedVideoPlay()"
                  (pause)="onGuidedVideoPause()"
                  (timeupdate)="onGuidedVideoTimeUpdate($event)"
                  (ended)="onGuidedVideoEnded()"
                >
                  <track
                    *ngIf="currentSubtitleUrl"
                    kind="subtitles"
                    srclang="es"
                    label="Español"
                    [src]="currentSubtitleUrl"
                  />
                  Tu navegador no soporta el video.
                </video>
                <div *ngIf="currentGuidedSubtitleText && !showQuestionModal" class="public-exam-guided-subtitle-overlay">
                  {{ currentGuidedSubtitleText }}
                </div>
                <div
                  *ngIf="showQuestionModal"
                  class="public-exam-modal-backdrop"
                  [class.public-exam-modal-backdrop-fullscreen]="isGuidedFullscreen"
                >
                  <div class="public-exam-modal-card">
                    <div class="public-exam-modal-header">
                      <div>
                        <div class="public-exam-kicker">Pregunta del tema</div>
                        <h3 class="public-exam-title mb-1">{{ guidedModalTheme?.tema }}</h3>
                        <p class="public-exam-subtitle mb-0">Responde las preguntas de este tema para continuar el video.</p>
                      </div>
                      <div class="public-exam-progress-pill">
                        <span class="material-symbols-outlined">pause_circle</span>
                        <span>Video pausado</span>
                      </div>
                    </div>

                    <div class="public-exam-modal-body">
                      <div *ngIf="guidedThemeQuestions.length === 0" class="text-on-surface-variant">
                        No hay preguntas asociadas a este tema.
                      </div>

                      <div *ngFor="let q of guidedThemeQuestions" class="public-exam-guided-question">
                        <div class="d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
                          <div>
                            <div class="public-exam-section-label mb-1">Pregunta</div>
                            <div class="text-on-surface fw-semibold">{{ q.question_text }}</div>
                          </div>
                          <span class="public-exam-question-badge">{{ questionTypeLabel(q.type) }}</span>
                        </div>

                        <div *ngIf="q.type === 'open'">
                          <textarea class="form-control public-exam-textarea" rows="4" [(ngModel)]="answers[q.id]" placeholder="Escriba su respuesta..."></textarea>
                        </div>

                        <div *ngIf="q.type === 'yes_no'" class="public-exam-option-list">
                          <label class="public-exam-option">
                            <input class="form-check-input" type="radio" [name]="'guided_' + q.id" [value]="'yes'" (change)="selectOption(q, 'yes')" />
                            <span>Si</span>
                          </label>
                          <label class="public-exam-option">
                            <input class="form-check-input" type="radio" [name]="'guided_' + q.id" [value]="'no'" (change)="selectOption(q, 'no')" />
                            <span>No</span>
                          </label>
                        </div>

                        <div *ngIf="q.type === 'multiple_choice' && q.options" class="public-exam-option-list">
                          <label *ngFor="let opt of q.options" class="public-exam-option public-exam-option-choice">
                            <input class="form-check-input" type="radio" [name]="'guided_' + q.id" [value]="opt.id" [(ngModel)]="answers[q.id]" />
                            <span>{{ opt.option_text }}</span>
                          </label>
                        </div>
                      </div>

                      <div *ngIf="guidedModalError" class="alert public-exam-alert public-exam-alert-danger mb-0 mt-3">
                        {{ guidedModalError }}
                      </div>
                    </div>

                    <div class="public-exam-modal-footer">
                      <button type="button" class="btn public-exam-primary-btn" (click)="continueGuidedVideo()">
                        Continuar video
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="public-exam-guided-panel">
                <div class="public-exam-guided-theme-monitor">
                  <div class="public-exam-section-label mb-2">Tema en curso</div>
                  <div class="public-exam-guided-theme-value">
                    <span class="material-symbols-outlined">label</span>
                    <div>
                      <div class="fw-semibold text-on-surface">
                        {{ currentGuidedTheme?.tema || currentGuidedCueTheme || 'Sin tema detectado' }}
                      </div>
                      <div class="text-on-surface-variant small">
                        {{
                          currentGuidedTheme
                            ? 'Tema ' + currentGuidedTheme.orden + ' | ' + currentGuidedTheme.inicio + 's - ' + currentGuidedTheme.fin + 's'
                            : currentGuidedCueTheme
                              ? 'Detectado por subtitulo | ' + formatTime(currentVideoTime)
                              : 'Esperando que el video entre a un tema'
                        }}
                      </div>
                      <div class="text-on-surface-variant small mt-1">
                        Tiempo actual: {{ formatTime(currentVideoTime) }}
                      </div>
                      <div class="text-on-surface-variant small mt-1">
                        Subtitulo actual: {{ currentGuidedSubtitleText || 'Sin subtitulo activo' }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="public-exam-guided-help">
                  <span class="material-symbols-outlined">quiz</span>
                  <div>
                    <div class="fw-semibold text-on-surface">Las preguntas aparecen automaticamente</div>
                  </div>
                </div>

                <div class="public-exam-guided-progress-group">
                  <div class="public-exam-progress-pill">
                    <span class="material-symbols-outlined">smart_display</span>
                    <span>{{ formatTime(currentVideoTime) }}</span>
                  </div>
                  <div class="public-exam-progress-pill public-exam-progress-pill-soft">
                    <span class="material-symbols-outlined">quiz</span>
                    <span>{{ answeredQuestionsCount() }} / {{ totalQuestions() }} respondidas</span>
                  </div>
                </div>

                <button type="button" class="btn public-exam-secondary-btn w-100 public-exam-guided-play-btn" (click)="playGuidedVideo()">
                  <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                  Reproducir video
                </button>

                <button type="button" class="btn public-exam-secondary-btn w-100 public-exam-guided-fullscreen-btn" (click)="toggleFullscreen(guidedStage)">
                  <span class="material-symbols-outlined text-[16px]">
                    {{ isGuidedFullscreen ? 'fullscreen_exit' : 'fullscreen' }}
                  </span>
                  {{ isGuidedFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  ,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .public-exam-shell {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.16), transparent 28%),
        linear-gradient(135deg, #07111f 0%, #0b1730 40%, #102a4d 100%);
      color: #eaf1ff;
    }

    .public-exam-shell::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 54px 54px;
      mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent 92%);
      pointer-events: none;
      opacity: 0.45;
    }

    .public-exam-backdrop,
    .public-exam-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(8px);
    }

    .public-exam-backdrop {
      width: 30rem;
      height: 30rem;
      right: -8rem;
      top: -8rem;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.18), transparent 70%);
    }

    .public-exam-orb {
      width: 16rem;
      height: 16rem;
      opacity: 0.55;
    }

    .public-exam-orb-a {
      left: -6rem;
      top: 14%;
      background: radial-gradient(circle, rgba(103, 232, 249, 0.18), transparent 68%);
    }

    .public-exam-orb-b {
      right: 7%;
      bottom: 10%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.16), transparent 68%);
    }

    .public-exam-container {
      position: relative;
      z-index: 1;
    }

    .public-exam-loading {
      min-height: 60vh;
      display: grid;
      place-items: center;
      text-align: center;
      color: rgba(226, 232, 240, 0.85);
    }

    .public-exam-card {
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(9, 16, 32, 0.62);
      backdrop-filter: blur(18px);
      box-shadow: 0 22px 60px rgba(2, 8, 23, 0.38);
      overflow: hidden;
    }

    .public-exam-hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem 1.5rem 1.2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(135deg, rgba(125, 211, 252, 0.09), rgba(147, 197, 253, 0.04));
    }

    .public-exam-hero-exam {
      align-items: center;
    }

    .public-exam-kicker {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.72rem;
      color: rgba(191, 219, 254, 0.8);
      font-weight: 700;
      margin-bottom: 0.45rem;
    }

    .public-exam-title {
      font-size: clamp(2rem, 3vw, 2.8rem);
      line-height: 1.05;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #f8fbff;
    }

    .public-exam-subtitle {
      max-width: 54rem;
      color: rgba(226, 232, 240, 0.84);
      line-height: 1.7;
    }

    .public-exam-hero-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: flex-end;
      min-width: 18rem;
    }

    .public-exam-hero-action {
      align-self: center;
      min-height: 3rem;
      padding-left: 1.35rem;
      padding-right: 1.35rem;
    }

    .public-exam-hero-action-blink {
      color: #020617;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 45%, #dbe4ee 100%);
      border: 1px solid rgba(148, 163, 184, 0.7);
      box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
      animation: publicExamBlink 1.35s ease-in-out infinite;
    }

    .public-exam-hero-action-blink:hover {
      color: #020617;
      filter: brightness(1.04);
    }

    .public-exam-stat {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      min-width: 8.8rem;
    }

    .public-exam-stat .material-symbols-outlined {
      color: #7dd3fc;
      font-size: 1.2rem;
    }

    .public-exam-stat-label,
    .public-exam-question-kicker,
    .public-exam-section-label,
    .public-exam-material-kicker,
    .public-exam-material-type {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.7rem;
      font-weight: 700;
      color: rgba(191, 219, 254, 0.78);
    }

    .public-exam-stat-value {
      font-size: 1.35rem;
      line-height: 1;
      font-weight: 800;
      color: #f8fbff;
      margin-top: 0.15rem;
    }

    .public-exam-body {
      padding: 1.35rem;
    }

    .public-exam-material-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 1rem;
    }

    .public-exam-material-card {
      grid-column: span 6;
      border-radius: 22px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-material-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1rem 0.85rem;
    }

    .public-exam-material-title,
    .public-exam-question-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #f8fbff;
    }

    .public-exam-material-badge,
    .public-exam-question-badge {
      border-radius: 999px;
      padding: 0.55rem 0.8rem;
      background: rgba(125, 211, 252, 0.12);
      border: 1px solid rgba(125, 211, 252, 0.18);
      color: #d9f0ff;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .public-exam-material-preview {
      padding: 0 1rem 1rem;
    }

    .public-exam-media-stage {
      position: relative;
    }

    .public-exam-media {
      width: 100%;
      min-height: 22rem;
      border: 0;
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.7);
      overflow: hidden;
      display: block;
    }

    .public-exam-media-fullscreen-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.6rem 0.9rem;
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.68);
      border: 1px solid rgba(148, 163, 184, 0.32);
      color: #f8fbff;
      font-weight: 700;
      backdrop-filter: blur(10px);
      box-shadow: 0 12px 24px rgba(2, 8, 23, 0.22);
    }

    .public-exam-media-fullscreen-btn:hover {
      color: #ffffff;
      background: rgba(15, 23, 42, 0.82);
      border-color: rgba(125, 211, 252, 0.45);
    }

    .public-exam-pdf {
      min-height: 26rem;
    }

    .public-exam-fallback {
      min-height: 22rem;
      display: grid;
      place-items: center;
      text-align: center;
      gap: 0.9rem;
      padding: 1.5rem;
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.55);
      color: rgba(226, 232, 240, 0.84);
    }

    .public-exam-fallback .material-symbols-outlined {
      width: 3.5rem;
      height: 3.5rem;
      display: grid;
      place-items: center;
      border-radius: 1rem;
      color: #7dd3fc;
      background: rgba(125, 211, 252, 0.12);
      font-size: 1.5rem;
    }

    .public-exam-outline-btn,
    .public-exam-primary-btn,
    .public-exam-secondary-btn,
    .public-exam-nav-btn {
      border-radius: 999px;
      padding: 0.85rem 1.2rem;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .public-exam-primary-btn {
      color: #06213f;
      background: linear-gradient(135deg, #7dd3fc 0%, #93c5fd 45%, #c4b5fd 100%);
      box-shadow: 0 16px 28px rgba(96, 165, 250, 0.2);
    }

    .public-exam-secondary-btn {
      color: #d9f0ff;
      background: rgba(125, 211, 252, 0.08);
      border-color: rgba(125, 211, 252, 0.18);
    }

    .public-exam-nav-btn {
      color: #eaf1ff;
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .public-exam-outline-btn {
      color: #d9f0ff;
      background: transparent;
      border-color: rgba(125, 211, 252, 0.18);
    }

    .public-exam-question-card {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-question-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .public-exam-question-title {
      font-size: 1.35rem;
    }

    .public-exam-question-materials,
    .public-exam-answer-block {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-question-material-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 1rem;
      margin-top: 0.9rem;
    }

    .public-exam-question-material-card {
      grid-column: span 6;
      border-radius: 20px;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-question-material-meta {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      margin-bottom: 0.9rem;
    }

    .public-exam-question-material-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.9rem;
      display: grid;
      place-items: center;
      color: #7dd3fc;
      background: rgba(125, 211, 252, 0.1);
    }

    .public-exam-question-material-icon .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .public-exam-question-material-name {
      color: #f8fbff;
      font-weight: 700;
      word-break: break-word;
    }

    .public-exam-question-material-media {
      width: 100%;
      min-height: 16rem;
      border-radius: 16px;
      background: rgba(2, 6, 23, 0.72);
      border: 0;
      display: block;
    }

    .public-exam-question-media {
      width: 100%;
      min-height: 18rem;
      border: 0;
      border-radius: 16px;
      background: rgba(2, 6, 23, 0.72);
      display: block;
    }

    .public-exam-textarea {
      min-height: 10rem;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.72);
      color: #f8fbff;
      border: 1px solid rgba(148, 163, 184, 0.22);
    }

    .public-exam-textarea:focus {
      border-color: rgba(125, 211, 252, 0.95);
      box-shadow: 0 0 0 0.22rem rgba(59, 130, 246, 0.18);
    }

    .public-exam-option-list {
      display: grid;
      gap: 0.75rem;
    }

    .public-exam-option {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 0.95rem 1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(241, 245, 249, 0.95);
    }

    .public-exam-option-choice {
      cursor: pointer;
    }

    .public-exam-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-counter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(226, 232, 240, 0.82);
    }

    .public-exam-progress-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.8rem 1rem;
      border-radius: 999px;
      background: rgba(125, 211, 252, 0.08);
      border: 1px solid rgba(125, 211, 252, 0.18);
      color: #d9f0ff;
      font-weight: 700;
      white-space: nowrap;
    }

    .public-exam-progress-pill .material-symbols-outlined {
      font-size: 1rem;
    }

    .public-exam-guided-progress-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      justify-content: flex-end;
      align-items: center;
      width: 100%;
    }

    .public-exam-guided-progress-group > .public-exam-progress-pill {
      flex: 1 1 0;
      min-width: 0;
      justify-content: center;
      text-align: center;
    }

    .public-exam-progress-pill-soft {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(226, 232, 240, 0.92);
    }

    .public-exam-empty-state {
      border-radius: 24px;
      padding: 2rem;
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(226, 232, 240, 0.84);
    }

    .public-exam-empty-state .material-symbols-outlined {
      display: inline-grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: 1rem;
      margin-bottom: 1rem;
      background: rgba(125, 211, 252, 0.1);
      color: #7dd3fc;
    }

    .public-exam-alert {
      border-radius: 1rem;
      border: 1px solid rgba(248, 113, 113, 0.28);
      background: rgba(127, 29, 29, 0.32);
      color: #fee2e2;
    }

    .public-exam-alert-danger {
      border-color: rgba(239, 68, 68, 0.72);
      background: linear-gradient(135deg, rgba(127, 29, 29, 0.92), rgba(185, 28, 28, 0.88));
      color: #fff1f2;
      box-shadow: 0 14px 30px rgba(127, 29, 29, 0.25);
    }

    .public-exam-guided-layout {
      display: grid;
      grid-template-columns: minmax(0, 2.2fr) minmax(18rem, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .public-exam-guided-video-card,
    .public-exam-guided-panel {
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      overflow: hidden;
    }

    .public-exam-guided-video {
      min-height: 24rem;
      border-radius: 0;
      background: #050816;
    }

    .public-exam-guided-stage {
      position: relative;
    }

    .public-exam-guided-controls {
      position: absolute;
      top: 0.9rem;
      right: 0.9rem;
      z-index: 3;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      width: min(100%, 12rem);
      max-width: 12rem;
      pointer-events: auto;
    }

    .public-exam-guided-play-btn {
      min-height: 2.8rem;
      justify-content: center;
    }

    .public-exam-guided-fullscreen-btn {
      min-height: 2.8rem;
      justify-content: center;
    }

    .public-exam-guided-panel {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .public-exam-guided-state {
      padding: 0.9rem 1rem;
      border-radius: 1rem;
      background: rgba(125, 211, 252, 0.08);
      border: 1px solid rgba(125, 211, 252, 0.16);
    }

    .public-exam-guided-help {
      display: flex;
      gap: 0.9rem;
      align-items: flex-start;
      padding: 0.95rem 1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-guided-theme-questions {
      display: grid;
      gap: 0.55rem;
      padding-top: 0.35rem;
    }

    .public-exam-guided-theme-question-item {
      display: flex;
      gap: 0.4rem;
      align-items: flex-start;
      padding: 0.65rem 0.75rem;
      border-radius: 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .public-exam-guided-theme-question-index {
      font-weight: 800;
      color: #7dd3fc;
      flex: 0 0 auto;
    }

    .public-exam-guided-theme-question-text {
      color: rgba(226, 232, 240, 0.9);
      line-height: 1.45;
    }

    .public-exam-guided-theme-monitor {
      padding: 0.95rem 1rem;
      border-radius: 1rem;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(125, 211, 252, 0.18);
    }

    .public-exam-guided-theme-value {
      display: flex;
      gap: 0.8rem;
      align-items: flex-start;
    }

    .public-exam-guided-theme-value .material-symbols-outlined {
      color: #7dd3fc;
      margin-top: 0.1rem;
    }

    .public-exam-guided-help .material-symbols-outlined {
      color: #7dd3fc;
      margin-top: 0.1rem;
    }

    .public-exam-guided-subtitle-overlay {
      position: absolute;
      left: 50%;
      bottom: 1rem;
      transform: translateX(-50%);
      max-width: min(84%, 44rem);
      padding: 0.45rem 0.75rem;
      border-radius: 0.65rem;
      background: rgba(0, 0, 0, 0.62);
      color: #fff;
      font-size: 0.92rem;
      line-height: 1.25;
      font-weight: 700;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
      pointer-events: none;
      z-index: 2;
    }

    .public-exam-preview-subtitle-overlay {
      bottom: 1.25rem;
      max-width: min(90%, 52rem);
      font-size: 1rem;
    }

    .public-exam-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1050;
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(10px);
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .public-exam-modal-backdrop-fullscreen {
      position: absolute;
    }

    .public-exam-modal-card {
      width: min(100%, 64rem);
      max-height: min(90vh, 56rem);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(9, 16, 32, 0.96);
      box-shadow: 0 24px 64px rgba(2, 8, 23, 0.5);
    }

    .public-exam-modal-header,
    .public-exam-modal-footer {
      padding: 1.25rem 1.35rem;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .public-exam-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-modal-body {
      padding: 1.35rem;
      overflow: auto;
      display: grid;
      gap: 1rem;
    }

    .public-exam-guided-question {
      padding: 1rem;
      border-radius: 1.1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .public-exam-modal-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    @media (max-width: 991.98px) {
      .public-exam-hero {
        flex-direction: column;
      }

      .public-exam-hero-stats {
        justify-content: flex-start;
        min-width: 0;
      }

      .public-exam-hero-action {
        width: 100%;
        justify-content: center;
      }

      .public-exam-material-card,
      .public-exam-question-material-card {
        grid-column: span 12;
      }

      .public-exam-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .public-exam-guided-layout {
        grid-template-columns: 1fr;
      }

      .public-exam-nav-btn,
      .public-exam-primary-btn,
      .public-exam-secondary-btn {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 575.98px) {
      .public-exam-body {
        padding: 1rem;
      }

      .public-exam-hero {
        padding: 1.15rem;
      }

      .public-exam-title {
        font-size: 1.8rem;
      }

      .public-exam-question-header {
        flex-direction: column;
      }

      .public-exam-media,
      .public-exam-pdf,
      .public-exam-question-media,
      .public-exam-guided-video {
        min-height: 14rem;
      }

      .public-exam-modal-header {
        flex-direction: column;
      }

      .public-exam-modal-footer {
        justify-content: stretch;
      }

      .public-exam-modal-footer .btn {
        width: 100%;
      }
    }

    @keyframes publicExamBlink {
      0% {
        transform: scale(1);
        box-shadow: 0 18px 32px rgba(15, 23, 42, 0.16);
      }
      50% {
        transform: scale(1.035);
        box-shadow: 0 24px 44px rgba(15, 23, 42, 0.26);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 18px 32px rgba(15, 23, 42, 0.16);
      }
    }
  `]
})
export class PublicExamComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @ViewChild('guidedStage') private guidedStage?: ElementRef<HTMLElement>;
  @ViewChild('guidedVideo') private guidedVideo?: ElementRef<HTMLVideoElement>;

  training?: Training;
  currentSubtitleUrl: string | null = null;
  loading = true;
  error = '';
  step: 'material' | 'exam' = 'material';
  answers: Record<number, any> = {};
  submitting = false;
  resultMessage = '';
  currentQuestionIndex = 0;
  currentVideoTime = 0;
  currentVideoDuration = 0;
  showQuestionModal = false;
  guidedModalError = '';
  guidedModalTheme: GuidedTheme | null = null;
  guidedThemeQuestions: Question[] = [];
  isGuidedFullscreen = false;
  private guidedPlaybackStarted = false;
  private activeGuidedThemeOrder: number | null = null;
  private guidedSyncRafId: number | null = null;
  private guidedThemeAnswered = new Set<number>();

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') ?? 0);
    this.loadExam(id);
  }

  ngAfterViewInit(): void {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  private examStateKey(trainingId: number): string {
    return `public_training_exam_started_${trainingId}`;
  }

  hasStartedExam(trainingId: number): boolean {
    return localStorage.getItem(this.examStateKey(trainingId)) === '1';
  }

  isGuidedIndexationMode(): boolean {
    return !!this.training?.material_with_indexation;
  }

  loadExam(id: number): void {
      this.loadingService.track(this.trainingService.takeExam(id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (training) => {
          this.training = training;
          this.currentSubtitleUrl = training.subtitle_url ?? this.getTrainingAudioIndexation(training)?.subtitle_url ?? null;
          this.resetGuidedState();
          if (!training.materials || training.materials.length === 0) {
            this.startExam();
            return;
          }

          if (training.material_with_indexation) {
            this.startExam();
            return;
          }

          this.step = 'material';
          this.currentQuestionIndex = 0;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al cargar el examen.';
        }
      });
  }

  selectOption(question: any, value: string): void {
    if (value === 'yes') {
      const yesOption = question.options?.find((o: any) => o.option_text?.toLowerCase() === 'si');
      this.answers[question.id] = yesOption?.id;
    } else {
      const noOption = question.options?.find((o: any) => o.option_text?.toLowerCase() === 'no');
      this.answers[question.id] = noOption?.id;
    }
  }

  currentQuestion(): Training['questions'] extends (infer Q)[] ? Q | null : any {
    return this.training?.questions?.[this.currentQuestionIndex] ?? null;
  }

  totalQuestions(): number {
    return this.training?.questions?.length ?? 0;
  }

  answeredQuestionsCount(): number {
    return (this.training?.questions ?? []).filter((question) => this.isQuestionAnswered(question)).length;
  }

  currentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  get currentGuidedTheme(): GuidedTheme | null {
    return this.getGuidedThemeForTime(this.currentVideoTime) ?? this.getCurrentGuidedSegmentTheme();
  }

  get currentGuidedCueTheme(): string {
    return this.getCurrentGuidedSubtitleCue()?.tema || '';
  }

  get currentGuidedSubtitleText(): string {
    const cues = this.getGuidedSubtitleCues();

    if (cues.length === 0) {
      return '';
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
    const cue = exactCue ?? [...orderedCues].reverse().find((item) => item.inicio <= this.currentVideoTime) ?? null;

    return cue?.texto?.trim() ?? '';
  }

  get currentGuidedThemeQuestions(): Question[] {
    const theme = this.getActiveGuidedTheme();

    if (!theme) {
      return [];
    }

    return this.getGuidedQuestionsForTheme(theme.orden);
  }

  private getGuidedSubtitleCues(): Array<{
    orden: number;
    inicio: number;
    fin: number;
    texto: string;
    tema: string;
  }> {
    const resultData = this.getTrainingAudioIndexation(this.training)?.result_data;
    const rootCues = this.training?.subtitle_cues ?? [];
    const directCues = rootCues.length > 0 ? rootCues : resultData?.subtitle_cues ?? [];

    if (directCues.length > 0) {
      return [...directCues]
        .map((cue) => ({
          orden: cue.orden ?? 0,
          inicio: cue.inicio ?? 0,
          fin: cue.fin ?? 0,
          texto: (cue.texto ?? '').trim(),
          tema: (cue.tema ?? '').trim()
        }))
        .filter((cue) => cue.texto !== '' && cue.fin > cue.inicio)
        .sort((left, right) => {
          if (left.inicio !== right.inicio) {
            return left.inicio - right.inicio;
          }

          if (left.fin !== right.fin) {
            return left.fin - right.fin;
          }

          return left.orden - right.orden;
        });
    }

    const segments = resultData?.segmentos ?? [];
    if (segments.length === 0) {
      return [];
    }

    const cues: Array<{ orden: number; inicio: number; fin: number; texto: string; tema: string }> = [];
    let cueOrder = 1;

    [...segments]
      .sort((left, right) => {
        if (left.inicio !== right.inicio) {
          return left.inicio - right.inicio;
        }

        if (left.fin !== right.fin) {
          return left.fin - right.fin;
        }

        return left.orden - right.orden;
      })
      .forEach((segment) => {
        const text = (segment.texto || segment.resumen || '').trim();
        if (!text) {
          return;
        }

        const parts = text.split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
          return;
        }

        const start = Number(segment.inicio) || 0;
        const end = Number(segment.fin) || start;
        const duration = Math.max(0.5, end - start);
        const totalWeight = Math.max(1, parts.reduce((sum, part) => sum + Math.max(1, part.length), 0));
        let cursor = start;

        parts.forEach((part, index) => {
          const weight = Math.max(1, part.length);
          const share = duration * (weight / totalWeight);
          const cueStart = cursor;
          const cueEnd = index === parts.length - 1 ? end : Math.min(end, cursor + share);

          cues.push({
            orden: cueOrder++,
            inicio: Number(cueStart.toFixed(3)),
            fin: Number(Math.max(cueEnd, cueStart + 0.5).toFixed(3)),
            texto: part,
            tema: (segment.tema || '').trim()
          });

          cursor = cueEnd;
        });
      });

    return cues;
  }

  private getCurrentGuidedSubtitleCue(): { orden: number; inicio: number; fin: number; texto: string; tema: string } | null {
    const cues = this.getGuidedSubtitleCues();

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
    return exactCue ?? [...orderedCues].reverse().find((item) => item.inicio <= this.currentVideoTime) ?? null;
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

  questionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      yes_no: 'Si / No',
      multiple_choice: 'Multiple'
    };

    return labels[type] || type;
  }

  materialTypeText(material: { type?: string; mime_type?: string }): string {
    if (this.isPdfMaterial(material)) {
      return 'PDF';
    }

    if (this.isVideoMaterial(material)) {
      return 'Video';
    }

    return (material.type || material.mime_type || 'Archivo').toString();
  }

  materialKindLabel(material: { type?: string; mime_type?: string }): string {
    return this.materialTypeText(material);
  }

  materialUrl(material: { url?: string; filepath: string }): string {
    return material.url || `/api/storage/${material.filepath}`;
  }

  isVideoMaterial(material: { type?: string; mime_type?: string }): boolean {
    const mimeType = (material.mime_type || '').toLowerCase();
    const materialType = (material.type || '').toLowerCase();
    return mimeType.startsWith('video/') || materialType === 'video';
  }

  isPdfMaterial(material: { type?: string; mime_type?: string }): boolean {
    const mimeType = (material.mime_type || '').toLowerCase();
    const materialType = (material.type || '').toLowerCase();
    return mimeType.includes('pdf') || materialType === 'pdf';
  }

  materialPoster(_material: { url?: string; filepath: string }): string {
    return '';
  }

  guidedVideoUrl(): string {
    return this.getVideoMaterial();
  }

  async toggleFullscreen(target?: HTMLElement | null): Promise<void> {
    const stage = target ?? this.guidedStage?.nativeElement;

    if (!stage) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await stage.requestFullscreen();
  }

  isFirstQuestion(): boolean {
    return this.currentQuestionIndex <= 0;
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex >= this.totalQuestions() - 1;
  }

  previousQuestion(): void {
    if (this.isFirstQuestion()) {
      return;
    }

    this.currentQuestionIndex--;
  }

  nextOrFinish(): void {
    if (!this.training) return;

    const q = this.currentQuestion();

    if (!q) {
      return;
    }

    if (!this.isQuestionAnswered(q)) {
      this.resultMessage = 'Debes responder la pregunta actual antes de continuar.';
      return;
    }

    this.resultMessage = '';

    if (!this.isLastQuestion()) {
      this.currentQuestionIndex++;
      return;
    }

    this.submitExam();
  }

  startExam(): void {
    if (!this.training) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.loadingService.track(this.trainingService.beginExam(this.training.id))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (training) => {
          const previousTraining = this.training!;
          const previousIndexation = this.getTrainingAudioIndexation(previousTraining);
          const incomingIndexation = this.getTrainingAudioIndexation(training);

          this.training = {
            ...previousTraining,
            ...training,
            themes: training.themes ?? previousTraining.themes ?? [],
            subtitle_url: training.subtitle_url ?? previousTraining.subtitle_url ?? previousIndexation?.subtitle_url ?? null,
            subtitle_cues: training.subtitle_cues ?? previousTraining.subtitle_cues ?? [],
            audioIndexation: incomingIndexation
              ? {
                  ...previousIndexation,
                  ...incomingIndexation,
                  themes: incomingIndexation.themes ?? previousIndexation?.themes ?? this.getTrainingAudioIndexation(previousTraining)?.themes ?? [],
                  question_assignments:
                    (incomingIndexation as TrainingAudioIndexation & { question_assignments?: GuidedQuestionAssignment[] }).question_assignments ??
                    previousIndexation?.question_assignments ??
                    (this.getTrainingAudioIndexation(previousTraining) as TrainingAudioIndexation & { question_assignments?: GuidedQuestionAssignment[] })?.question_assignments ??
                    [],
                  questionAssignments:
                    incomingIndexation.questionAssignments ??
                    previousIndexation?.questionAssignments ??
                    this.getTrainingAudioIndexation(previousTraining)?.questionAssignments ??
                    [],
                }
              : previousIndexation,
            attempt_in_progress: true,
          };

          this.currentSubtitleUrl = this.training.subtitle_url ?? this.getTrainingAudioIndexation(this.training)?.subtitle_url ?? null;
          localStorage.setItem(this.examStateKey(this.training.id), '1');
          this.step = 'exam';
          this.currentQuestionIndex = 0;
          this.currentVideoTime = 0;
          this.currentVideoDuration = 0;
          this.resetGuidedState();
        },
        error: (err) => {
          this.resultMessage = '';
          this.error = err.error?.message || 'No fue posible iniciar el examen.';
        }
      });
  }

  isQuestionAnswered(question: any): boolean {
    const value = this.answers[question.id];

    if (question.type === 'open') {
      return typeof value === 'string' && value.trim() !== '';
    }

    return value !== undefined && value !== null && value !== '';
  }

  submitExam(): void {
    if (!this.training) return;

    const submitAnswers: SubmitAnswer[] = (this.training.questions ?? []).map(q => ({
      question_id: q.id,
      answer_text: q.type === 'open' ? String(this.answers[q.id] ?? '').trim() : undefined,
      selected_option_id: q.type !== 'open' ? Number(this.answers[q.id]) : undefined,
    }));

    this.submitting = true;
    this.loadingService.track(this.trainingService.submitExam(this.training.id, submitAnswers))
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          localStorage.removeItem(this.examStateKey(this.training!.id));
          this.router.navigate(['/public/trainings', this.training!.id, 'result']);
        },
        error: (err) => {
          this.resultMessage = err.error?.message || 'Error al enviar respuestas.';
        }
      });
  }

  onGuidedVideoLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement | null;

    if (!video) {
      return;
    }

    this.syncGuidedVideoState(video.currentTime, video.duration);
    this.applySubtitleTrackMode(video);
  }

  onGuidedVideoPlay(): void {
    this.guidedPlaybackStarted = true;
    this.startGuidedPlaybackMonitor();
  }

  onGuidedVideoPause(): void {
    this.stopGuidedPlaybackMonitor();
  }

  onPreviewVideoLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement | null;

    if (!video) {
      return;
    }

    this.syncGuidedVideoState(video.currentTime, video.duration);
    this.applySubtitleTrackMode(video);

    if (this.currentVideoTime > 0.2) {
      this.guidedPlaybackStarted = true;
    }
  }

  onGuidedVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement | null;

    if (!video) {
      return;
    }

    const previousTime = this.currentVideoTime;
    this.syncGuidedVideoState(video.currentTime, video.duration);
    this.handleGuidedThemeProgress(video, previousTime);
  }

  onPreviewVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement | null;

    if (!video) {
      return;
    }

    this.syncGuidedVideoState(video.currentTime, video.duration);
  }

  onGuidedVideoEnded(): void {
    this.stopGuidedPlaybackMonitor();

    if (this.isGuidedIndexationMode()) {
      const theme = this.getActiveGuidedTheme();
      const questions = theme ? this.getGuidedQuestionsForTheme(theme.orden) : [];

      if (theme && questions.length > 0 && !this.guidedThemeAnswered.has(theme.orden)) {
        this.pauseGuidedVideo();
        this.guidedModalTheme = theme;
        this.guidedThemeQuestions = questions;
        this.guidedModalError = '';
        this.showQuestionModal = true;
        return;
      }
    }

    if (this.showQuestionModal) {
      return;
    }

    this.submitExam();
  }

  continueGuidedVideo(): void {
    if (!this.guidedModalTheme) {
      return;
    }

    const invalidQuestion = this.guidedThemeQuestions.find((question) => !this.isQuestionAnswered(question));
    if (invalidQuestion) {
      this.guidedModalError = 'Debes responder todas las preguntas del tema para continuar.';
      return;
    }

    this.guidedThemeAnswered.add(this.guidedModalTheme.orden);
    this.showQuestionModal = false;
    this.guidedModalError = '';
    this.guidedModalTheme = null;
    this.guidedThemeQuestions = [];

    const video = this.guidedVideo?.nativeElement;
    if (video && (video.ended || this.currentVideoTime >= this.currentVideoDuration - 0.2)) {
      this.submitExam();
      return;
    }

    this.playGuidedVideo();
  }

  private syncGuidedVideoState(currentTime: number, duration: number): void {
    this.currentVideoTime = Number.isFinite(currentTime) ? currentTime : 0;
    this.currentVideoDuration = Number.isFinite(duration) && duration > 0 ? duration : this.currentVideoDuration;
  }

  private startGuidedPlaybackMonitor(): void {
    if (this.guidedSyncRafId !== null) {
      return;
    }

    const tick = () => {
      const video = this.guidedVideo?.nativeElement;

      if (!video || video.paused || video.ended) {
        this.guidedSyncRafId = null;
        return;
      }

      const previousTime = this.currentVideoTime;
      this.syncGuidedVideoState(video.currentTime, video.duration);
      this.handleGuidedThemeProgress(video, previousTime);
      this.guidedSyncRafId = window.requestAnimationFrame(tick);
    };

    this.guidedSyncRafId = window.requestAnimationFrame(tick);
  }

  private stopGuidedPlaybackMonitor(): void {
    if (this.guidedSyncRafId === null) {
      return;
    }

    window.cancelAnimationFrame(this.guidedSyncRafId);
    this.guidedSyncRafId = null;
  }

  private applySubtitleTrackMode(video: HTMLVideoElement | null): void {
    if (!video) {
      return;
    }

    const track = video.textTracks[0];
    if (track) {
      track.mode = 'hidden';
    }
  }

  private handleGuidedThemeProgress(video: HTMLVideoElement, previousTime: number): void {
    if (!this.isGuidedIndexationMode() || this.showQuestionModal || !this.training) {
      return;
    }

    if (!this.guidedPlaybackStarted) {
      return;
    }

    const sortedThemes = [...this.getGuidedThemes()].sort((left, right) => {
      if (left.fin !== right.fin) {
        return left.fin - right.fin;
      }

      return left.orden - right.orden;
    });

    const crossedTheme = sortedThemes.find((theme) => previousTime < theme.fin && this.currentVideoTime >= theme.fin);
    if (!crossedTheme || this.guidedThemeAnswered.has(crossedTheme.orden)) {
      return;
    }

    const questions = this.getGuidedQuestionsForTheme(crossedTheme.orden);
    if (questions.length === 0) {
      return;
    }

    this.pauseGuidedVideo();
    this.guidedModalTheme = crossedTheme;
    this.guidedThemeQuestions = questions;
    this.guidedModalError = '';
    this.showQuestionModal = true;

    if (video.currentTime > crossedTheme.fin) {
      video.currentTime = Math.max(crossedTheme.fin - 0.05, crossedTheme.inicio);
      this.syncGuidedVideoState(video.currentTime, video.duration);
    }
  }

  playGuidedVideo(): void {
    const video = this.guidedVideo?.nativeElement;
    if (!video) {
      return;
    }

    video.play().catch(() => {
      // La reproduccion puede ser bloqueada por el navegador.
    });
  }

  private pauseGuidedVideo(): void {
    this.guidedVideo?.nativeElement.pause();
  }

  private readonly handleFullscreenChange = (): void => {
    this.isGuidedFullscreen = document.fullscreenElement === this.guidedStage?.nativeElement;
  };

  private resetGuidedState(): void {
    this.currentVideoTime = 0;
    this.currentVideoDuration = 0;
    this.showQuestionModal = false;
    this.guidedModalError = '';
    this.guidedModalTheme = null;
    this.guidedThemeQuestions = [];
    this.guidedThemeAnswered = new Set<number>();
    this.guidedPlaybackStarted = false;
    this.activeGuidedThemeOrder = null;
    this.stopGuidedPlaybackMonitor();
  }

  private getVideoMaterial(): string {
    return this.training?.materials?.find((material) => this.isVideoMaterial(material))?.url || '';
  }

  private getGuidedThemes(): GuidedTheme[] {
    const rootThemes = this.training?.themes ?? [];
    if (rootThemes.length > 0) {
      return rootThemes
        .map((theme) => ({
          orden: Number(theme.orden) || 0,
          tema: (theme.tema || '').trim(),
          inicio: Number(theme.inicio) || 0,
          fin: Number(theme.fin) || 0,
        }))
        .filter((theme) => theme.orden > 0 && theme.tema !== '' && theme.fin >= theme.inicio)
        .sort((left, right) => {
          if (left.inicio !== right.inicio) {
            return left.inicio - right.inicio;
          }

          if (left.fin !== right.fin) {
            return left.fin - right.fin;
          }

          return left.orden - right.orden;
        });
    }

    const guidedThemes: TrainingAudioIndexationTheme[] = this.getTrainingAudioIndexation(this.training)?.themes ?? [];

    if (guidedThemes.length > 0) {
      return guidedThemes
        .map((theme) => ({
          orden: Number(theme.theme_order) || 0,
          tema: (theme.theme_text || '').trim(),
          inicio: Number(theme.start_seconds) || 0,
          fin: Number(theme.end_seconds) || 0,
        }))
        .filter((theme) => theme.orden > 0 && theme.tema !== '' && theme.fin >= theme.inicio)
        .sort((left, right) => {
          if (left.inicio !== right.inicio) {
            return left.inicio - right.inicio;
          }

          if (left.fin !== right.fin) {
            return left.fin - right.fin;
          }

          return left.orden - right.orden;
        });
    }

    return (this.getTrainingAudioIndexation(this.training)?.result_data?.temas_detectados ?? [])
      .map((theme) => ({
        orden: Number(theme.orden) || 0,
        tema: (theme.tema || '').trim(),
        inicio: Number(theme.inicio) || 0,
        fin: Number(theme.fin) || 0,
      }))
      .filter((theme) => theme.orden > 0 && theme.tema !== '' && theme.fin >= theme.inicio)
      .sort((left, right) => {
        if (left.inicio !== right.inicio) {
          return left.inicio - right.inicio;
        }

        if (left.fin !== right.fin) {
          return left.fin - right.fin;
        }

        return left.orden - right.orden;
      });
  }

  private getGuidedQuestions(): Question[] {
    return this.training?.questions ?? [];
  }

  private getGuidedQuestionAssignmentMap(): Record<number, number[]> {
    const fromRelation = this.getGuidedQuestionAssignments();

    return fromRelation.reduce<Record<number, number[]>>((carry, item) => {
      const themeOrder = Number(item.theme_order);
      if (!Number.isFinite(themeOrder) || themeOrder <= 0) {
        return carry;
      }

      const rawIds = Array.isArray(item.question_ids) && item.question_ids.length > 0
        ? item.question_ids
        : item.question_id !== undefined && item.question_id !== null
          ? [item.question_id]
          : [];

      const ids = rawIds
        .map((questionId) => Number(questionId))
        .filter((questionId) => Number.isFinite(questionId));
      carry[themeOrder] = Array.from(new Set([...(carry[themeOrder] ?? []), ...ids]));
      return carry;
    }, {});
  }

  private getGuidedQuestionAssignments(): GuidedQuestionAssignment[] {
    const training = this.training as (Training & {
      question_assignments?: GuidedQuestionAssignment[];
      questionAssignments?: GuidedQuestionAssignment[];
    }) | null | undefined;

    const audioIndexation = this.getTrainingAudioIndexation(training) as (TrainingAudioIndexation & {
      question_assignments?: GuidedQuestionAssignment[];
      questionAssignments?: GuidedQuestionAssignment[];
    }) | null | undefined;

    const assignments = [
      ...(audioIndexation?.question_assignments ?? []),
      ...(audioIndexation?.questionAssignments ?? []),
      ...((audioIndexation?.result_data?.question_assignments ?? []) as GuidedQuestionAssignment[]),
      ...(training?.question_assignments ?? []),
      ...(training?.questionAssignments ?? []),
    ];

    return assignments.filter((item) => Number.isFinite(Number(item?.theme_order)));
  }

  private getGuidedQuestionsForTheme(themeOrder: number): Question[] {
    const assignmentMap = this.getGuidedQuestionAssignmentMap();
    const questionIds = new Set(assignmentMap[themeOrder] ?? []);
    return this.getGuidedQuestions().filter((question) => questionIds.has(question.id));
  }

  private getCurrentGuidedSegmentTheme(): GuidedTheme | null {
    const segment = this.getCurrentGuidedSegment();
    if (!segment) {
      return null;
    }

    return {
      orden: segment.orden ?? 0,
      tema: (segment.tema || segment.subtema || segment.resumen || '').trim(),
      inicio: Number(segment.inicio) || 0,
      fin: Number(segment.fin) || 0
    };
  }

  private getActiveGuidedTheme(): GuidedTheme | null {
    return this.getGuidedThemeForTime(this.currentVideoTime) ?? this.getCurrentGuidedSegmentTheme();
  }

  private getCurrentGuidedSegment(): VideoIndexAnalysisResponse['segmentos'][number] | null {
    const segments = [...(this.getTrainingAudioIndexation(this.training)?.result_data?.segmentos ?? [])].sort((left, right) => {
      if (left.inicio !== right.inicio) {
        return left.inicio - right.inicio;
      }

      if (left.fin !== right.fin) {
        return left.fin - right.fin;
      }

      return left.orden - right.orden;
    });

    if (segments.length === 0) {
      return null;
    }

    const exactSegment = segments.find((segment) => this.currentVideoTime >= segment.inicio && this.currentVideoTime < segment.fin);
    return exactSegment ?? [...segments].reverse().find((segment) => segment.inicio <= this.currentVideoTime) ?? null;
  }

  private getGuidedThemeForTime(currentTime: number): GuidedTheme | null {
    const themes = [...this.getGuidedThemes()].sort((left, right) => {
      if (left.inicio !== right.inicio) {
        return left.inicio - right.inicio;
      }

      return left.fin - right.fin;
    });

    if (themes.length === 0) {
      return null;
    }

    const exactTheme = themes.find((theme) => currentTime >= theme.inicio && currentTime < theme.fin);
    if (exactTheme) {
      return exactTheme;
    }

    const previousTheme = [...themes].reverse().find((theme) => theme.inicio <= currentTime);
    return previousTheme ?? themes[0] ?? null;
  }

  private getTrainingAudioIndexation(training?: Training | null): TrainingAudioIndexation | null {
    if (!training) {
      return null;
    }

    return training.audioIndexation ?? training.audio_indexation ?? null;
  }
}
