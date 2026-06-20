import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TestUploadResponse {
  message: string;
  data: {
    dato1: string;
    dato2: string;
  };
  adjunto: {
    original_name: string;
    mime_type: string;
    size_bytes: number;
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
}
