import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(userData: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/register`, userData);
  }

  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/auth/google`,
      idToken,
      { headers: { 'Content-Type': 'text/plain' } }
    ).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
          this.extractAndSaveUserId(response.token);  // ✅ Extrae y guarda el userId
        }
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/local`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
          this.extractAndSaveUserId(response.token);  // ✅ Extrae y guarda el userId
        }
      })
    );
  }

  logout(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { headers });
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');  // ✅ También limpia el userId
    this.router.navigate(['/login']);
  }

  // ✅ Método para solicitar reset de contraseña
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/request-password-reset`, { email });
  }

  // ✅ Método para resetear contraseña con token
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/reset-password`, { 
      token, 
      newPassword 
    });
  }

  // ✅ Guardar token
  saveToken(token: string): void {
    localStorage.setItem('token', token);
    console.log('💾 Token guardado');
  }

  // ✅ Extraer y guardar userId del token
  private extractAndSaveUserId(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      console.log('🔍 Token decodificado:', decoded);
      
      // ✅ Busca el UUID en diferentes campos
      const userId = decoded.sub || decoded.userId || decoded.id || decoded.user_id;
      
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

  // ✅ Obtener token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ✅ Obtener userId guardado
  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  // ✅ Verificar si está logueado
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}