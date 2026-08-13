import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(userData: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/register`, userData);
  }

  // ✅ Login con Google - Envía objeto JSON { idToken }
  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/auth/google`,
      { idToken }  // ✅ Objeto JSON
    ).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
          this.extractAndSaveUserId(response.token);
          
          // ✅ Guardar imagen de Google si viene en el response
          if (response.profileImage) {
            this.saveGoogleProfileImage(response.profileImage);
          }
        }
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/local`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
          this.extractAndSaveUserId(response.token);
        }
      })
    );
  }

  logout(): Observable<any> {
  return this.http.post(`${this.baseUrl}/auth/logout`, {});
}

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('profileImage');  // ✅ Limpia también la imagen
    this.router.navigate(['/login']);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/request-password-reset`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/reset-password`, { 
      token, 
      newPassword 
    });
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
    console.log('💾 Token guardado');
  }

  // ✅ Guardar imagen de Google en localStorage
  saveGoogleProfileImage(imageUrl: string): void {
    if (imageUrl) {
      localStorage.setItem('profileImage', imageUrl);
      console.log('💾 Imagen de Google guardada:', imageUrl);
    }
  }

  private extractAndSaveUserId(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      console.log('🔍 Token decodificado:', decoded);
      
      const userId = decoded.id || decoded.sub || decoded.userId || decoded.user_id;
      
      if (userId) {
        localStorage.setItem('userId', userId);
        console.log('💾 userId guardado:', userId);
      } else {
        console.error('❌ No se encontró userId en el token. Campos disponibles:', Object.keys(decoded));
      }
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}