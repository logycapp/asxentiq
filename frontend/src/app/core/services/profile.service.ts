import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from './auth.service';

export interface ProfileResponse {
  user: AuthUser;
}

export interface ProfileUpdateResponse {
  message: string;
  user: AuthUser;
}

export interface ProfileAvatarResponse {
  message: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/profile`;

  get(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(this.apiUrl);
  }

  update(formData: FormData): Observable<ProfileUpdateResponse> {
    return this.http.post<ProfileUpdateResponse>(this.apiUrl, formData);
  }

  generateAvatar(): Observable<ProfileAvatarResponse> {
    return this.http.post<ProfileAvatarResponse>(`${this.apiUrl}/avatar/generate`, {});
  }
}
