import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../authServices/auth';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ✅ Obtener headers con token
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ✅ Obtener userId del AuthService
  private getUserId(): string | null {
    return this.authService.getUserId();
  }

  // ✅ Obtener perfil del usuario
  getProfile(): Observable<any> {
    const userId = this.getUserId();
    
    if (!userId) {
      console.error('❌ No hay userId disponible. Haz login primero.');
      return throwError(() => new Error('No userId available'));
    }

    console.log('📍 Obteniendo perfil del usuario:', userId);
    return this.http.get(`${this.baseUrl}/user/profile/${userId}`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // ✅ Actualizar foto de perfil
  uploadProfileImage(file: File): Observable<any> {
    const userId = this.getUserId();
    
    if (!userId) {
      console.error('❌ No hay userId disponible');
      return throwError(() => new Error('No userId available'));
    }

    const formData = new FormData();
    formData.append('image', file);

    console.log('📸 Subiendo imagen para usuario:', userId);
    return this.http.post(`${this.baseUrl}/user/profile/${userId}/image`, formData, { 
      headers: this.getAuthHeaders() 
    });
  }

  // ✅ Actualizar perfil
  updateProfile(data: any): Observable<any> {
    const userId = this.getUserId();
    
    if (!userId) {
      console.error('❌ No hay userId disponible');
      return throwError(() => new Error('No userId available'));
    }

    console.log('✏️ Actualizando perfil del usuario:', userId);
    return this.http.put(`${this.baseUrl}/user/profile/${userId}`, data, { 
      headers: this.getAuthHeaders() 
    });
  }
}