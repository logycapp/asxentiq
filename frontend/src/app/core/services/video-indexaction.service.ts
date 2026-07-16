import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VideoIndexAudioResponse {
  message: string;
  source: {
    video_path: string;
    video_url: string;
  };
  audio: {
    original_name: string;
    path: string;
    url: string;
  };
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

export interface VideoIndexStoredResponse {
  training_id: number;
  audio_path: string | null;
  audio_url: string | null;
  indexed_at: string | null;
  cached: boolean;
  result_data: VideoIndexAnalysisResponse | null;
}

@Injectable({
  providedIn: 'root'
})
export class VideoIndexActionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/video-indexaction`;

  extractAudio(videoPath: string): Observable<VideoIndexAudioResponse> {
    return this.http.post<VideoIndexAudioResponse>(`${this.apiUrl}/extract-audio`, { video_path: videoPath });
  }

  getIndexation(trainingId: number): Observable<VideoIndexStoredResponse> {
    return this.http.get<VideoIndexStoredResponse>(`${this.apiUrl}/trainings/${trainingId}/indexation`);
  }

  analyzeAudio(trainingId: number, audioPath: string): Observable<VideoIndexAnalysisResponse> {
    return this.http.post<VideoIndexAnalysisResponse>(
      `${this.apiUrl}/trainings/${trainingId}/analyze-audio`,
      { audio_path: audioPath }
    );
  }
}
