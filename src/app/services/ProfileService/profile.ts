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

  // ✅ Subir imagen con token en el header
uploadProfileImage(file: File): Observable<any> {
  const token = this.authService.getToken();

  if (!token) {
    return throwError(() => new Error('No token available'));
  }

  const formData = new FormData();
  formData.append('file', file);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  // ✅ URL SIN el userId - el backend lo saca del token
  console.log('📸 Subiendo imagen...');
  return this.http.post(`${this.baseUrl}/user/profile/image`, formData, { headers });
}

  removeProfileImage(): Observable<any> {
  const token = this.authService.getToken();

  if (!token) {
    return throwError(() => new Error('No token available'));
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  console.log('🗑️ Eliminando imagen de perfil...');
  return this.http.delete(`${this.baseUrl}/user/profile/image`, { headers });
}

  // ✅ Actualizar perfil
updateProfile(data: any): Observable<any> {
  const userId = this.getUserId();
  
  if (!userId) {
    console.error('❌ No hay userId disponible');
    return throwError(() => new Error('No userId available'));
  }

  console.log('✏️ Actualizando perfil del usuario:', userId);
  
  // ✅ URL correcta: /user/{userId} (sin /profile/)
  return this.http.put(`${this.baseUrl}/user/${userId}`, data, { 
    headers: this.getAuthHeaders() 
  });
}
}