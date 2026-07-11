import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TestUploadResponse {
  message: string;
  data: {
    titulo: string;
  };
  video: {
    original_name: string;
    mime_type: string;
    size_bytes: number;
    path: string | null;
    url: string | null;
  };
}

export interface TestAudioResponse {
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

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/test`;

  submit(formData: FormData): Observable<TestUploadResponse> {
    return this.http.post<TestUploadResponse>(this.apiUrl, formData);
  }

  extractAudio(videoPath: string): Observable<TestAudioResponse> {
    return this.http.post<TestAudioResponse>(`${this.apiUrl}/extract-audio`, { video_path: videoPath });
  }
}
