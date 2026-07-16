import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Training {
  id: number;
  title: string;
  description?: string;
  type: string;
  modality: string;
  scheduled_date: string;
  completion_date?: string;
  duration_hours?: number;
  location?: string;
  instructor?: string;
  mandatory: boolean;
  status: string;
  passing_score: number;
  questions_count?: number;
  users_count?: number;
  participants_count?: number;
  created_at?: string;
  updated_at?: string;
  questions?: Question[];
  materials?: TrainingMaterial[];
  audioIndexation?: TrainingAudioIndexation | null;
  users?: any[];
  participants?: TrainingParticipant[];
}

export interface TrainingAudioIndexation {
  id: number;
  training_id: number;
  audio_path: string;
  result_data: VideoIndexAnalysisResponse;
  indexed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: number;
  training_id: number;
  question_text: string;
  type: string;
  order: number;
  options?: QuestionOption[];
  materials?: TrainingMaterial[];
  user_answers?: UserAnswer[];
}

export interface QuestionOption {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
  order: number;
}

export interface QuestionSaveOption {
  option_text: string;
  is_correct: boolean;
  order: number;
}

export interface QuestionSavePayload {
  question_text?: string;
  type?: string;
  order?: number;
  options?: QuestionSaveOption[];
}

export interface TrainingMaterial {
  id: number;
  trainable_type: string;
  trainable_id: number;
  filename: string;
  filepath: string;
  mime_type: string;
  filesize?: number;
  type: string;
  created_at?: string;
}

export interface TrainingParticipant {
  id: number;
  document_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  pivot: {
    training_id?: number;
    training_participant_id?: number;
    attended: boolean | null;
    score: number | null;
    passed?: boolean | null;
    observations?: string | null;
    attendance_date?: string | null;
    completed_at: string | null;
    name?: string;
  };
}

export interface UserAnswer {
  id: number;
  training_user_id: number;
  question_id: number;
  answer_text?: string;
  selected_option_id?: number;
  is_correct?: boolean;
  score?: number;
  answered_at?: string;
}

export interface PublicUser {
  id: number;
  name: string;
  document_number: string;
}

export interface PublicLoginResponse {
  token: string;
  user: PublicUser;
}

export interface SubmitAnswer {
  question_id: number;
  answer_text?: string;
  selected_option_id?: number;
}

export interface SubmitResponse {
  message: string;
  score: number | null;
  total_questions: number;
  autograded: number;
  correct: number;
}

export interface TrainingResult {
  training: Training;
  score: number | null;
  passed: boolean | null;
  completed_at: string;
}

export interface ParticipantReviewAnswer {
  answer_text?: string | null;
  selected_option_id?: number | null;
  selected_option_text?: string | null;
  is_correct?: boolean | null;
  score?: number | null;
  answered_at?: string | null;
}

export interface ParticipantReviewQuestion {
  id: number;
  question_text: string;
  type: string;
  order: number;
  options: QuestionOption[];
  answer: ParticipantReviewAnswer | null;
}

export interface ParticipantReview {
  participant: TrainingParticipant;
  pivot: TrainingParticipant['pivot'];
  questions: ParticipantReviewQuestion[];
}

export interface ParticipantReviewUpdateAnswer {
  question_id: number;
  score: number | null;
}

export interface TrainingListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface TrainingListSummary {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface TrainingListResponse {
  data: Training[];
  meta: TrainingListMeta;
  summary: TrainingListSummary;
}

export interface ParticipantsImportResult {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
}

export interface VideoIndexAnalysisResponse {
  titulo_detectado: string;
  idioma: string;
  duracion_aproximada_segundos: number;
  resumen_general: string;
  temas_detectados: Array<{
    orden: number;
    tema: string;
    inicio: number;
    fin: number;
  }>;
  segmentos: Array<{
    orden: number;
    inicio: number;
    fin: number;
    tema: string;
    subtema: string;
    resumen: string;
    texto: string;
    palabras_clave: string[];
    preguntas_posibles: string[];
  }>;
}

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/trainings`;

  // Admin
  list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
  }): Observable<TrainingListResponse> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params?.per_page !== undefined) {
      httpParams = httpParams.set('per_page', String(params.per_page));
    }

    if (params?.search !== undefined) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params?.sort_by !== undefined) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params?.sort_dir !== undefined) {
      httpParams = httpParams.set('sort_dir', params.sort_dir);
    }

    return this.http.get<TrainingListResponse>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<Training> {
    return this.http.get<Training>(`${this.apiUrl}/${id}`);
  }

  create(payload: Partial<Training>): Observable<{ message: string; training: Training }> {
    return this.http.post<{ message: string; training: Training }>(this.apiUrl, payload);
  }

  update(id: number, payload: Partial<Training>): Observable<{ message: string; training: Training }> {
    return this.http.put<{ message: string; training: Training }>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  assignUsers(trainingId: number, userIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${trainingId}/assign`, { user_ids: userIds });
  }

  removeUser(trainingId: number, userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${trainingId}/users/${userId}`);
  }

  getUsers(trainingId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${trainingId}/users`);
  }

  getQuestions(trainingId: number): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.apiUrl}/${trainingId}/questions`);
  }

  createQuestion(trainingId: number, payload: QuestionSavePayload): Observable<{ message: string; question: Question }> {
    return this.http.post<{ message: string; question: Question }>(`${this.apiUrl}/${trainingId}/questions`, payload);
  }

  updateQuestion(questionId: number, payload: QuestionSavePayload): Observable<{ message: string; question: Question }> {
    return this.http.put<{ message: string; question: Question }>(`/api/questions/${questionId}`, payload);
  }

  deleteQuestion(questionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/questions/${questionId}`);
  }

  createOption(questionId: number, payload: Partial<QuestionOption>): Observable<{ message: string; option: QuestionOption }> {
    return this.http.post<{ message: string; option: QuestionOption }>(`/api/questions/${questionId}/options`, payload);
  }

  updateOption(optionId: number, payload: Partial<QuestionOption>): Observable<{ message: string; option: QuestionOption }> {
    return this.http.put<{ message: string; option: QuestionOption }>(`/api/question-options/${optionId}`, payload);
  }

  deleteOption(optionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/question-options/${optionId}`);
  }

  uploadTrainingMaterial(trainingId: number, file: File, type: string): Observable<{ message: string; material: TrainingMaterial }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<{ message: string; material: TrainingMaterial }>(
      `${this.apiUrl}/${trainingId}/materials`, formData
    );
  }

  deleteTrainingMaterial(trainingId: number, materialId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${trainingId}/materials/${materialId}`);
  }

  uploadQuestionMaterial(questionId: number, file: File, type: string): Observable<{ message: string; material: TrainingMaterial }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<{ message: string; material: TrainingMaterial }>(
      `/api/questions/${questionId}/materials`, formData
    );
  }

  deleteQuestionMaterial(questionId: number, materialId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/questions/${questionId}/materials/${materialId}`);
  }

  // Participants
  getAllParticipants(): Observable<TrainingParticipant[]> {
    return this.http.get<TrainingParticipant[]>(`${environment.apiUrl}/participants`);
  }

  createParticipant(payload: Partial<TrainingParticipant>): Observable<{ message: string; participant: TrainingParticipant }> {
    return this.http.post<{ message: string; participant: TrainingParticipant }>(`${environment.apiUrl}/participants`, payload);
  }

  updateParticipant(id: number, payload: Partial<TrainingParticipant>): Observable<{ message: string; participant: TrainingParticipant }> {
    return this.http.put<{ message: string; participant: TrainingParticipant }>(`${environment.apiUrl}/participants/${id}`, payload);
  }

  deleteParticipant(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/participants/${id}`);
  }

  downloadParticipantsReport(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/participants/export`, {
      responseType: 'blob'
    });
  }

  importParticipantsReport(file: File): Observable<ParticipantsImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ParticipantsImportResult>(`${environment.apiUrl}/participants/import`, formData);
  }

  getAssignedParticipants(trainingId: number): Observable<TrainingParticipant[]> {
    return this.http.get<TrainingParticipant[]>(`${this.apiUrl}/${trainingId}/participants`);
  }

  assignParticipants(trainingId: number, participantIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${trainingId}/assign-participants`, { participant_ids: participantIds });
  }

  removeParticipant(trainingId: number, participantId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${trainingId}/participants/${participantId}`);
  }

  getParticipantReview(trainingId: number, participantId: number): Observable<ParticipantReview> {
    return this.http.get<ParticipantReview>(`${this.apiUrl}/${trainingId}/participants/${participantId}/review`);
  }

  updateParticipantReview(
    trainingId: number,
    participantId: number,
    payload: { answers: ParticipantReviewUpdateAnswer[]; observations: string | null }
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${trainingId}/participants/${participantId}/review`, payload);
  }

  resetParticipantAttempt(trainingId: number, participantId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${trainingId}/participants/${participantId}/reset`, {});
  }

  // Public
  publicLogin(documentNumber: string): Observable<PublicLoginResponse> {
    return this.http.post<PublicLoginResponse>(`${environment.apiUrl}/public/trainings/login`, {
      document_number: documentNumber
    });
  }

  getPending(): Observable<Training[]> {
    return this.http.get<Training[]>(`${environment.apiUrl}/public/trainings/pending`);
  }

  getCompleted(): Observable<Training[]> {
    return this.http.get<Training[]>(`${environment.apiUrl}/public/trainings/completed`);
  }

  takeExam(trainingId: number): Observable<Training> {
    return this.http.get<Training>(`${environment.apiUrl}/public/trainings/${trainingId}/take`);
  }

  submitExam(trainingId: number, answers: SubmitAnswer[]): Observable<SubmitResponse> {
    return this.http.post<SubmitResponse>(`${environment.apiUrl}/public/trainings/${trainingId}/submit`, { answers });
  }

  getResult(trainingId: number): Observable<TrainingResult> {
    return this.http.get<TrainingResult>(`${environment.apiUrl}/public/trainings/${trainingId}/result`);
  }

  downloadCertificate(trainingId: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/public/trainings/${trainingId}/certificate`, {
      responseType: 'blob'
    });
  }
}
