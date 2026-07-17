import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Tooltip } from 'bootstrap';
import { filter, finalize, Subscription } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import {
  ParticipantReview,
  Question,
  QuestionOption,
  TrainingCategory,
  Training,
  TrainingListMeta,
  TrainingListSummary,
  TrainingParticipant,
  TrainingService
} from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterOutlet,
    PageHeaderComponent,
    ModalShellComponent
  ],
  templateUrl: './training-list.component.html',
  styleUrls: ['./training-list.component.css']
})
export class TrainingListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  trainings: Training[] = [];
  searchTerm = '';
  sortBy = 'scheduled_date';
  sortDir: 'asc' | 'desc' = 'desc';
  meta: TrainingListMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null
  };
  summary: TrainingListSummary = {
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  };
  loading = false;
  message = '';
  errorMessage = '';
  isParticipantsRoute = false;
  isCategoriesRoute = false;
  categories: TrainingCategory[] = [];
  activeProgramId: number | null = null;
  activeProgramName = '';
  expandedProgramKeys = new Set<string>();
  private tooltipInstances = new Map<HTMLElement, { dispose: () => void }>();
  private tooltipRefreshTimer: number | null = null;

  // Modal state
  editingTraining: Training | null = null;
  activeEditTab: 'general' | 'questions' | 'assign' | 'results' = 'general';
  questions: Question[] = [];
  questionsLoading = false;
  questionsMessage = '';
  questionsError = '';
  editingQuestion = false;
  editingQuestionId: number | null = null;
  editForm: Partial<Question> = { question_text: '', type: 'open', order: 0 };
  editingOptions: Partial<QuestionOption>[] = [];
  editingQuestionMaterials: NonNullable<Question['materials']> = [];
  questionMaterialFile: File | null = null;
  questionMaterialType = 'pdf';
  trainingMaterials: NonNullable<Training['materials']> = [];
  trainingMaterialFile: File | null = null;
  trainingMaterialType = 'pdf';
  loadingEditDetails = false;
  allParticipants: TrainingParticipant[] = [];
  assignedParticipants: TrainingParticipant[] = [];
  selectedIds = new Set<number>();
  assignMessage = '';
  assignError = '';
  assignSaving = false;
  reviewingParticipant: TrainingParticipant | null = null;
  reviewData: ParticipantReview | null = null;
  reviewLoading = false;
  reviewSaving = false;
  reviewError = '';
  reviewObservations = '';
  reviewScores: Record<number, string> = {};
  editTitle = '';
  editDescription = '';
  editTrainingCategoryId: number | null = null;
  editType = 'sst_training';
  editModality = 'presential';
  editStatus = 'scheduled';
  editScheduledDate = '';
  editDurationHours: number | undefined;
  editPassingScore = 70;
  editLocation = '';
  editInstructor = '';
  editMandatory = true;
  saving = false;

  ngOnInit(): void {
    this.updateRouteFlags();
    this.updateProgramFilterFromUrl();
    this.loadCategories();
    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.updateRouteFlags();
          this.updateProgramFilterFromUrl();
          this.loadCategories();
          this.loadTrainings();
        })
    );

    this.loadTrainings();
  }

  ngAfterViewInit(): void {
    this.scheduleTooltipRefresh();
  }

  ngOnDestroy(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
      this.tooltipRefreshTimer = null;
    }

    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();
    this.subscriptions.unsubscribe();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.meta.last_page;
    const current = this.meta.current_page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  loadTrainings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(
      this.trainingService.list({
        page: this.meta.current_page,
        per_page: this.meta.per_page,
        search: this.searchTerm || undefined,
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
        training_category_id: this.activeProgramId ?? undefined
      })
    )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.trainings = response.data;
          this.meta = response.meta;
          this.summary = response.summary;
          this.scheduleTooltipRefresh();
        },
        error: () => (this.errorMessage = 'No fue posible cargar las capacitaciones.')
      });
  }

  loadCategories(): void {
    this.loadingService.track(this.trainingService.getCategories()).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.syncActiveProgramName();
      },
      error: () => {
        this.categories = [];
      }
    });
  }

  applyFilters(): void {
    this.meta = { ...this.meta, current_page: 1 };
    this.loadTrainings();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.meta.last_page) return;
    this.meta = { ...this.meta, current_page: page };
    this.loadTrainings();
  }

  toggleSort(key: string): void {
    if (this.sortBy === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = key;
      this.sortDir = 'asc';
    }
    this.meta = { ...this.meta, current_page: 1 };
    this.loadTrainings();
  }

  clearProgramFilter(): void {
    this.router.navigate(['/trainings_programs']);
  }

  getSortIcon(key: string): string {
    if (this.sortBy !== key) return 'unfold_more';
    return this.sortDir === 'asc' ? 'north' : 'south';
  }

  openEditModal(training: Training): void {
    this.editingTraining = training;
    this.activeEditTab = 'general';
    this.loadingEditDetails = true;
    this.questions = [];
    this.questionsError = '';
    this.questionsMessage = '';
    this.editingQuestion = false;
    this.editingQuestionId = null;
    this.editingOptions = [];
    this.editingQuestionMaterials = [];
    this.questionMaterialFile = null;
    this.questionMaterialType = 'pdf';
    this.allParticipants = [];
    this.assignedParticipants = [];
    this.selectedIds.clear();
    this.assignMessage = '';
    this.assignError = '';
    this.reviewingParticipant = null;
    this.reviewData = null;
    this.reviewLoading = false;
    this.reviewSaving = false;
    this.reviewError = '';
    this.reviewObservations = '';
    this.reviewScores = {};
    this.editTitle = training.title;
    this.editDescription = training.description || '';
    this.editTrainingCategoryId = training.training_category_id ?? training.category?.id ?? null;
    this.editType = training.type;
    this.editModality = training.modality;
    this.editStatus = training.status;
    this.editScheduledDate = training.scheduled_date;
    this.editDurationHours = training.duration_hours;
    this.editPassingScore = training.passing_score;
    this.editLocation = training.location || '';
    this.editInstructor = training.instructor || '';
    this.editMandatory = training.mandatory;
    this.errorMessage = '';
    this.saving = false;
    this.loadEditTrainingDetails(training.id);
  }

  closeEditModal(): void {
    this.editingTraining = null;
    this.activeEditTab = 'general';
    this.questions = [];
    this.questionsLoading = false;
    this.questionsMessage = '';
    this.questionsError = '';
    this.editingQuestion = false;
    this.editingQuestionId = null;
    this.editingOptions = [];
    this.editingQuestionMaterials = [];
    this.questionMaterialFile = null;
    this.trainingMaterials = [];
    this.trainingMaterialFile = null;
    this.trainingMaterialType = 'pdf';
    this.editTrainingCategoryId = null;
    this.loadingEditDetails = false;
    this.allParticipants = [];
    this.assignedParticipants = [];
    this.selectedIds.clear();
    this.assignMessage = '';
    this.assignError = '';
    this.reviewingParticipant = null;
    this.reviewData = null;
    this.reviewLoading = false;
    this.reviewSaving = false;
    this.reviewError = '';
    this.reviewObservations = '';
    this.reviewScores = {};
  }

  setEditTab(tab: 'general' | 'questions' | 'assign' | 'results'): void {
    this.activeEditTab = tab;
    if (!this.editingTraining) {
      return;
    }

    if (tab === 'questions' && this.questions.length === 0 && !this.questionsLoading) {
      this.loadQuestions();
    }

    if (tab === 'assign' && this.allParticipants.length === 0 && this.assignedParticipants.length === 0) {
      this.loadAssignmentData();
    }

    if (tab === 'results' && !this.reviewLoading) {
      this.loadResultsData();
    }
  }

  saveEditModal(): void {
    if (!this.editingTraining || !this.editTitle) return;

    if (!this.editTrainingCategoryId) {
      this.errorMessage = 'Selecciona un programa.';
      return;
    }

    const payload: Partial<Training> = {
      title: this.editTitle,
      training_category_id: this.editTrainingCategoryId,
      description: this.editDescription || undefined,
      type: this.editType,
      modality: this.editModality,
      status: this.editStatus,
      scheduled_date: this.editScheduledDate,
      duration_hours: this.editDurationHours || undefined,
      passing_score: this.editPassingScore,
      location: this.editLocation || undefined,
      instructor: this.editInstructor || undefined,
      mandatory: this.editMandatory,
    };

    this.saving = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.update(this.editingTraining.id, payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          const savedTraining = response.training;

          if (!this.trainingMaterialFile) {
            this.message = response.message;
            this.closeEditModal();
            this.loadTrainings();
            return;
          }

          const materialFile = this.trainingMaterialFile;
          const materialType = this.trainingMaterialType;

          this.loadingService.track(this.trainingService.uploadTrainingMaterial(savedTraining.id, materialFile, materialType))
            .subscribe({
              next: (materialRes) => {
                this.trainingMaterials = [...this.trainingMaterials, materialRes.material];
                this.trainingMaterialFile = null;
                this.message = `${response.message} Material cargado correctamente.`;
                this.closeEditModal();
                this.loadTrainings();
              },
              error: () => {
                this.errorMessage = 'La capacitacion se guardo, pero no se pudo cargar el material.';
              }
            });
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al guardar la capacitacion.';
        }
      });
  }

  loadEditTrainingDetails(trainingId: number): void {
    this.loadingService.track(this.trainingService.get(trainingId)).subscribe({
      next: (training) => {
        this.editingTraining = training;
        this.editTrainingCategoryId = training.training_category_id ?? training.category?.id ?? this.editTrainingCategoryId;
        this.trainingMaterials = training.materials ?? [];
        this.loadingEditDetails = false;
      },
      error: () => {
        this.loadingEditDetails = false;
        this.errorMessage = 'No se pudo cargar el material de la capacitacion.';
      }
    });
  }

  onTrainingMaterialSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.trainingMaterialFile = input.files?.[0] ?? null;
  }

  clearTrainingMaterial(): void {
    this.trainingMaterialFile = null;
    this.trainingMaterialType = 'pdf';
  }

  removeTrainingMaterial(material: NonNullable<Training['materials']>[number]): void {
    if (!this.editingTraining || !window.confirm(`Eliminar ${material.filename}?`)) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteTrainingMaterial(this.editingTraining.id, material.id)).subscribe({
      next: () => {
        this.trainingMaterials = this.trainingMaterials.filter((item) => item.id !== material.id);
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el material.';
      }
    });
  }

  loadQuestions(): void {
    if (!this.editingTraining) return;

    this.questionsLoading = true;
    this.questionsError = '';

    this.loadingService.track(this.trainingService.getQuestions(this.editingTraining.id))
      .pipe(finalize(() => (this.questionsLoading = false)))
      .subscribe({
        next: (questions) => {
          this.questions = questions;
        },
        error: () => {
          this.questionsError = 'Error al cargar preguntas.';
        }
      });
  }

  showAddQuestionForm(): void {
    this.editingQuestion = true;
    this.editingQuestionId = null;
    this.editForm = { question_text: '', type: 'open', order: this.questions.length + 1 };
    this.editingOptions = [];
    this.editingQuestionMaterials = [];
    this.clearQuestionMaterial();
  }

  editQuestion(q: Question): void {
    this.editingQuestion = true;
    this.editingQuestionId = q.id;
    this.editForm = { question_text: q.question_text, type: q.type, order: q.order };
    this.editingOptions = (q.options || []).map((o) => ({ ...o }));
    this.editingQuestionMaterials = q.materials ?? [];
    this.clearQuestionMaterial();
  }

  cancelQuestionEdit(): void {
    this.editingQuestion = false;
    this.editingQuestionId = null;
    this.editingOptions = [];
    this.editingQuestionMaterials = [];
    this.clearQuestionMaterial();
  }

  onQuestionTypeChange(): void {
    if (this.editForm.type === 'multiple_choice') {
      if (this.editingOptions.length === 0) {
        this.addOption();
        this.addOption();
      }
      return;
    }

    if (this.editForm.type === 'yes_no') {
      this.editingOptions = [
        { option_text: 'Si', is_correct: false, order: 0 },
        { option_text: 'No', is_correct: false, order: 1 }
      ];
      return;
    }

    this.editingOptions = [];
  }

  addOption(): void {
    this.editingOptions.push({ option_text: '', is_correct: false, order: this.editingOptions.length });
  }

  setCorrectOption(index: number): void {
    this.editingOptions.forEach((option, currentIndex) => {
      option.is_correct = currentIndex === index;
    });
  }

  saveQuestion(): void {
    if (!this.editingTraining) return;

    const normalizedOptions = this.editingOptions
      .map((opt, index) => ({
        option_text: (opt.option_text ?? '').trim(),
        is_correct: !!opt.is_correct,
        order: opt.order ?? index
      }))
      .filter((opt) => opt.option_text !== '');

    if ((this.editForm.type === 'multiple_choice' || this.editForm.type === 'yes_no') && normalizedOptions.length < 2) {
      this.questionsError = 'La pregunta debe tener al menos 2 opciones.';
      return;
    }

    const payload = {
      question_text: this.editForm.question_text,
      type: this.editForm.type,
      order: this.editForm.order ?? 0,
      options: this.editForm.type === 'multiple_choice' || this.editForm.type === 'yes_no' ? normalizedOptions : []
    };

    const saveObs = this.editingQuestionId
      ? this.trainingService.updateQuestion(this.editingQuestionId, payload)
      : this.trainingService.createQuestion(this.editingTraining.id, payload);

    this.loadingService.track(saveObs).subscribe({
      next: (res) => {
        const savedQuestion = res.question;

        if (!this.questionMaterialFile) {
          this.questionsMessage = res.message;
          this.cancelQuestionEdit();
          this.loadQuestions();
          return;
        }

        const materialFile = this.questionMaterialFile;
        const materialType = this.questionMaterialType;

        this.loadingService.track(this.trainingService.uploadQuestionMaterial(savedQuestion.id, materialFile, materialType))
          .subscribe({
            next: () => {
              this.questionsMessage = `${res.message} Material cargado correctamente.`;
              this.cancelQuestionEdit();
              this.loadQuestions();
            },
            error: () => {
              this.questionsError = 'La pregunta se guardo, pero no se pudo cargar el material.';
            }
          });
      },
      error: () => (this.questionsError = 'Error al guardar la pregunta.')
    });
  }

  onQuestionMaterialSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.questionMaterialFile = input.files?.[0] ?? null;
  }

  clearQuestionMaterial(): void {
    this.questionMaterialFile = null;
    this.questionMaterialType = 'pdf';
  }

  removeQuestionMaterial(material: NonNullable<Question['materials']>[number]): void {
    if (!this.editingQuestionId || !window.confirm(`Eliminar ${material.filename}?`)) {
      return;
    }

    this.loadingService.track(this.trainingService.deleteQuestionMaterial(this.editingQuestionId, material.id)).subscribe({
      next: () => {
        this.editingQuestionMaterials = this.editingQuestionMaterials.filter((item) => item.id !== material.id);
      },
      error: () => {
        this.questionsError = 'No se pudo eliminar el material.';
      }
    });
  }

  deleteQuestion(q: Question): void {
    if (!window.confirm('Eliminar esta pregunta?')) return;

    this.loadingService.track(this.trainingService.deleteQuestion(q.id)).subscribe({
      next: () => {
        this.questionsMessage = 'Pregunta eliminada.';
        this.loadQuestions();
      },
      error: () => (this.questionsError = 'Error al eliminar.')
    });
  }

  loadAssignmentData(): void {
    if (!this.editingTraining) return;

    this.assignError = '';

    this.loadingService.track(this.trainingService.getAssignedParticipants(this.editingTraining.id)).subscribe({
      next: (participants) => {
        this.assignedParticipants = participants;
      }
    });

    this.loadingService.track(this.trainingService.getAllParticipants()).subscribe({
      next: (participants) => {
        this.allParticipants = participants;
      }
    });
  }

  get availableParticipants(): TrainingParticipant[] {
    const assignedIds = new Set(this.assignedParticipants.map((participant) => participant.id));
    return this.allParticipants.filter((participant) => !assignedIds.has(participant.id));
  }

  toggleParticipant(participantId: number): void {
    if (this.selectedIds.has(participantId)) {
      this.selectedIds.delete(participantId);
      return;
    }

    this.selectedIds.add(participantId);
  }

  assignParticipants(): void {
    if (!this.editingTraining || this.selectedIds.size === 0) return;

    this.assignSaving = true;
    this.assignError = '';

    this.loadingService.track(
      this.trainingService.assignParticipants(this.editingTraining.id, [...this.selectedIds])
    )
      .pipe(finalize(() => (this.assignSaving = false)))
      .subscribe({
        next: (res) => {
          this.assignMessage = res.message;
          this.selectedIds.clear();
          this.loadAssignmentData();
        },
        error: () => {
          this.assignError = 'Error al asignar participantes.';
        }
      });
  }

  removeParticipant(participantId: number): void {
    if (!this.editingTraining) return;

    this.loadingService.track(this.trainingService.removeParticipant(this.editingTraining.id, participantId)).subscribe({
      next: (res) => {
        this.assignMessage = res.message;
        this.assignedParticipants = this.assignedParticipants.filter((participant) => participant.id !== participantId);
      },
      error: () => {
        this.assignError = 'Error al remover participante.';
      }
    });
  }

  loadResultsData(): void {
    if (!this.editingTraining) return;

    this.loadingService.track(this.trainingService.get(this.editingTraining.id)).subscribe({
      next: (training) => {
        this.editingTraining = training;
      }
    });
  }

  resetAttempt(participant: TrainingParticipant): void {
    if (!this.editingTraining) return;

    const name = participant.full_name || (participant as any).name || 'este participante';
    const confirmed = window.confirm(
      `Reabrir el intento de ${name}? Esto borrara sus respuestas y le permitira volver a presentar la prueba.`
    );

    if (!confirmed) return;

    this.loadingService.track(this.trainingService.resetParticipantAttempt(this.editingTraining.id, participant.id)).subscribe({
      next: () => this.loadResultsData()
    });
  }

  openReview(participant: TrainingParticipant): void {
    if (!this.editingTraining) return;

    this.reviewingParticipant = participant;
    this.reviewData = null;
    this.reviewError = '';
    this.reviewLoading = true;
    this.reviewObservations = participant.pivot.observations ?? '';
    this.reviewScores = {};

    this.loadingService.track(this.trainingService.getParticipantReview(this.editingTraining.id, participant.id)).subscribe({
      next: (review) => {
        this.reviewData = review;
        this.reviewObservations = review.pivot.observations ?? '';
        this.reviewScores = review.questions.reduce((acc, question) => {
          if (question.type === 'open') {
            acc[question.id] = question.answer?.score === null || question.answer?.score === undefined
              ? ''
              : String(question.answer.score);
          }

          return acc;
        }, {} as Record<number, string>);
        this.reviewLoading = false;
      },
      error: (err) => {
        this.reviewError = err.error?.message || 'No se pudo cargar la revision.';
        this.reviewLoading = false;
      }
    });
  }

  saveReview(): void {
    if (!this.editingTraining || !this.reviewingParticipant) return;

    const openQuestions = this.reviewData?.questions.filter((question) => question.type === 'open') ?? [];

    try {
      const answers = openQuestions.map((question) => {
        const rawScore = String(this.reviewScores[question.id] ?? '').trim();

        if (rawScore !== '' && Number.isNaN(Number(rawScore))) {
          throw new Error(`El puntaje de la pregunta ${question.order} no es valido.`);
        }

        return {
          question_id: question.id,
          score: rawScore === '' ? null : Number(rawScore),
        };
      });

      this.reviewSaving = true;
      this.reviewError = '';

      const payload = {
        answers,
        observations: this.reviewObservations.trim() === '' ? null : this.reviewObservations.trim(),
      };

      this.loadingService.track(
        this.trainingService.updateParticipantReview(this.editingTraining.id, this.reviewingParticipant.id, payload)
      ).subscribe({
        next: () => {
          this.reviewSaving = false;
          this.loadResultsData();
          this.openReview(this.reviewingParticipant!);
        },
        error: (err) => {
          this.reviewSaving = false;
          this.reviewError = err.error?.message || 'No se pudo guardar la revision.';
        }
      });
    } catch (error) {
      this.reviewSaving = false;
      this.reviewError = error instanceof Error ? error.message : 'No se pudo validar la calificacion.';
    }
  }

  closeReview(): void {
    this.reviewingParticipant = null;
    this.reviewData = null;
    this.reviewError = '';
    this.reviewObservations = '';
    this.reviewScores = {};
  }

  questionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      multiple_choice: 'Opcion multiple',
      yes_no: 'Si / No',
    };

    return labels[type] || type;
  }

  hasOpenQuestions(): boolean {
    return this.reviewData?.questions.some((question) => question.type === 'open') ?? false;
  }

  hasPendingOpenQuestions(): boolean {
    return this.reviewData?.questions.some(
      (question) =>
        question.type === 'open' &&
        (question.answer?.score === null || question.answer?.score === undefined)
    ) ?? false;
  }

  participantPassed(participant: TrainingParticipant): boolean {
    const passed = participant.pivot.passed;

    if (passed !== null && passed !== undefined) {
      return passed;
    }

    return (participant.pivot.score ?? 0) >= (this.editingTraining?.passing_score ?? 70);
  }

  presentedLabel(participant: TrainingParticipant): 'Sí' | 'No' | 'Pendiente' {
    const attended = (participant.pivot as any).attended;

    if (attended === null || attended === undefined) {
      return 'Pendiente';
    }

    return attended === true || attended === 1 || attended === '1' ? 'Sí' : 'No';
  }

  remove(training: Training): void {
    const confirmed = window.confirm(`Eliminar "${training.title}"?`);
    if (!confirmed) return;

    this.loadingService.track(this.trainingService.delete(training.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadTrainings();
      },
      error: () => (this.errorMessage = 'Error al eliminar la capacitacion.')
    });
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      medical_exam: 'Examen Medico',
      sst_training: 'Capacitacion SST',
      drill: 'Simulacro',
      induction: 'Induccion'
    };
    return labels[type] || type;
  }

  categoryLabel(category: TrainingCategory | null | undefined): string {
    return category?.name || 'Sin programa';
  }

  get isProgramFilteredView(): boolean {
    return this.activeProgramId !== null;
  }

  programKey(category: TrainingCategory | null | undefined): string {
    return category ? `program-${category.id}` : 'program-uncategorized';
  }

  isProgramExpanded(category: TrainingCategory | null | undefined): boolean {
    return this.expandedProgramKeys.has(this.programKey(category));
  }

  toggleProgram(category: TrainingCategory | null | undefined): void {
    const key = this.programKey(category);

    if (this.expandedProgramKeys.has(key)) {
      this.expandedProgramKeys.delete(key);
      return;
    }

    this.expandedProgramKeys.add(key);
  }

  get groupedTrainings(): Array<{ category: TrainingCategory | null; trainings: Training[] }> {
    const groups = new Map<string, { category: TrainingCategory | null; trainings: Training[] }>();

    this.trainings.forEach((training) => {
      const category = training.category ?? null;
      const key = category ? `category-${category.id}` : 'uncategorized';

      if (!groups.has(key)) {
        groups.set(key, { category, trainings: [] });
      }

      groups.get(key)?.trainings.push(training);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (!left.category && !right.category) {
        return 0;
      }

      if (!left.category) {
        return 1;
      }

      if (!right.category) {
        return -1;
      }

      const orderDiff = (left.category.sort_order ?? 0) - (right.category.sort_order ?? 0);
      return orderDiff !== 0 ? orderDiff : left.category.name.localeCompare(right.category.name);
    });
  }

  modalityLabel(modality: string): string {
    const labels: Record<string, string> = {
      presential: 'Presencial',
      virtual: 'Virtual',
      mixed: 'Mixto'
    };
    return labels[modality] || modality;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Programada',
      completed: 'Realizada',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  }

  statusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      scheduled: 'training-status-badge training-status-scheduled',
      completed: 'training-status-badge training-status-completed',
      cancelled: 'training-status-badge training-status-cancelled'
    };
    return classes[status] || 'training-status-badge training-status-neutral';
  }

  private updateRouteFlags(): void {
    const currentUrl = this.router.url.split('?')[0].split('#')[0].replace(/\/$/, '');
    this.isParticipantsRoute = currentUrl.endsWith('/participants');
    this.isCategoriesRoute = false;
  }

  private updateProgramFilterFromUrl(): void {
    const rawProgramId = this.route.snapshot.paramMap.get('programId') ?? this.route.snapshot.queryParamMap.get('training_category_id');
    const programId = rawProgramId ? Number(rawProgramId) : 0;

    this.activeProgramId = Number.isFinite(programId) && programId > 0 ? programId : null;
    this.syncActiveProgramName();
  }

  private syncActiveProgramName(): void {
    if (!this.activeProgramId) {
      this.activeProgramName = '';
      return;
    }

    this.activeProgramName = this.categories.find((category) => category.id === this.activeProgramId)?.name ?? '';
  }

  private refreshTooltips(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();

    document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]').forEach((element) => {
      const tooltip = new Tooltip(element, {
        trigger: 'hover focus',
        placement: element.getAttribute('data-bs-placement') || 'top',
        container: 'body'
      });

      this.tooltipInstances.set(element, tooltip);
    });
  }

  private scheduleTooltipRefresh(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
    }

    this.tooltipRefreshTimer = window.setTimeout(() => {
      this.tooltipRefreshTimer = null;
      this.refreshTooltips();
    }, 0);
  }
}
