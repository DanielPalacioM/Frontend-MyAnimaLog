import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// Respuesta de POST /auth/local, /auth/google y /auth/refresh.
// refreshToken y expiresIn llegan desde el cambio del User service;
// las sesiones viejas solo tienen token.
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  profileImage?: string;
}

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
const EXPIRES_AT_KEY = 'tokenExpiresAt';
const USER_ID_KEY = 'userId';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  // Refresh en curso. Todas las peticiones que reciben 401 a la vez esperan
  // este mismo refresh: el refresh token rota y reusarlo cierra todas las sesiones.
  private refreshInFlight$: Observable<string> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(userData: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/register`, userData);
  }

  // POST /auth/verify-email { email, code } -> confirma el PIN que llega al
  // correo después de registrarse (solo la primera vez).
  verifyEmail(email: string, code: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/verify-email`, { email, code });
  }

  // ✅ Login con Google - Envía objeto JSON { idToken }
  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/google`,
      { idToken }  // ✅ Objeto JSON
    ).pipe(
      tap(response => {
        if (response.token) {
          this.saveSession(response);

          // ✅ Guardar imagen de Google si viene en el response
          if (response.profileImage) {
            this.saveGoogleProfileImage(response.profileImage);
          }
        }
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/local`, credentials).pipe(
      tap(response => {
        if (response.token) {
          this.saveSession(response);
        }
      })
    );
  }

  // POST /auth/refresh { refreshToken } -> par nuevo. Devuelve el token nuevo.
  // Si ya hay un refresh en curso, se reutiliza en vez de lanzar otro.
  refreshSession(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token'));
    }

    this.refreshInFlight$ = this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => this.saveSession(response)),
      map(response => response.token),
      finalize(() => { this.refreshInFlight$ = null; }),
      shareReplay(1)
    );

    return this.refreshInFlight$;
  }

  // Manda el refreshToken para que el backend también lo invalide.
  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post(`${this.baseUrl}/auth/logout`, refreshToken ? { refreshToken } : {});
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem('profileImage');  // ✅ Limpia también la imagen
    this.refreshInFlight$ = null;
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
    localStorage.setItem(TOKEN_KEY, token);
  }

  // Guarda el par de tokens, cuándo vence el token y el userId.
  private saveSession(response: AuthResponse): void {
    this.saveToken(response.token);

    if (response.refreshToken) {
      localStorage.setItem(REFRESH_KEY, response.refreshToken);
    }

    const expiresAt = this.computeExpiresAt(response);
    if (expiresAt) {
      localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    } else {
      localStorage.removeItem(EXPIRES_AT_KEY);
    }

    this.extractAndSaveUserId(response.token);
  }

  // expiresIn (segundos) manda; si no viene, se usa el claim exp del token.
  // No se asume una duración fija: hoy es 1 hora y puede bajar a 15 minutos.
  private computeExpiresAt(response: AuthResponse): number | null {
    if (response.expiresIn) {
      return Date.now() + response.expiresIn * 1000;
    }
    try {
      const decoded: any = jwtDecode(response.token);
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  // ✅ Guardar imagen de Google en localStorage
  saveGoogleProfileImage(imageUrl: string): void {
    if (imageUrl) {
      localStorage.setItem('profileImage', imageUrl);
    }
  }

  // El id del usuario va en el claim `id`. Desde el cambio del User service,
  // `sub` también es el UUID, pero antes era el email: solo se usa si es UUID.
  private extractAndSaveUserId(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      const fromSub = typeof decoded.sub === 'string' && UUID_RE.test(decoded.sub) ? decoded.sub : null;
      const userId = decoded.id || fromSub || decoded.userId || decoded.user_id;

      if (userId) {
        localStorage.setItem(USER_ID_KEY, String(userId));
      } else {
        console.error('❌ No se encontró userId en el token. Campos disponibles:', Object.keys(decoded));
      }
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  // true si el token vence en menos de `marginMs` (sirve para renovarlo antes).
  isTokenExpiringSoon(marginMs = 30_000): boolean {
    const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY));
    if (!expiresAt) return false;
    return Date.now() >= expiresAt - marginMs;
  }

  getUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
