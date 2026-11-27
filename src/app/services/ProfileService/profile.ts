import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../authServices/auth';
import { environment } from 'src/environments/environment';

// Datos públicos mínimos de OTRO usuario (dueño, cuidador, quien invita).
export interface UserSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
}

// Ruta (tras el gateway) para buscar un usuario por correo.
const USER_BY_EMAIL_PATH = '/user/by-email';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl = environment.apiUrl;

  // Cache por userId: la misma persona aparece en varias cards/pantallas y
  // no tiene sentido pedir su perfil cada vez.
  private userCache = new Map<string, Observable<UserSummary | null>>();
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

  // GET /user/profile/{userId} de OTRO usuario -> nombre y foto.
  // Si falla (o el backend no deja verlo) devuelve null en vez de romper.
  getUserById(userId: string): Observable<UserSummary | null> {
    if (!userId) return of(null);
    if (!this.userCache.has(userId)) {
      const req$ = this.http.get<any>(`${this.baseUrl}/user/profile/${userId}`, {
        headers: this.getAuthHeaders()
      }).pipe(
        map(p => ({
          id: userId,
          // Nombre para mostrar: nombre completo si lo tiene (User service), si no el username.
          username: p?.fullName || p?.username || p?.name || '',
          avatarUrl: p?.profileImageUrl || p?.avatarUrl || null
        })),
        catchError(err => {
          console.error(`❌ No se pudo cargar el perfil del usuario ${userId}:`, err);
          this.userCache.delete(userId);
          return of(null);
        }),
        shareReplay(1)
      );
      this.userCache.set(userId, req$);
    }
    return this.userCache.get(userId)!;
  }

  // Busca una cuenta ACTIVA por correo (para invitar a compartir una mascota).
  // Devuelve null si no existe / no está activa (404) o si falla.
  // TODO: confirmar la ruta con el backend; está en USER_BY_EMAIL_PATH.
  findUserByEmail(email: string): Observable<UserSummary | null> {
    return this.http.get<any>(`${this.baseUrl}${USER_BY_EMAIL_PATH}`, {
      headers: this.getAuthHeaders(),
      params: { email }
    }).pipe(
      map(u => {
        const user = u?.data ?? u;
        const id = user?.id ?? user?.userId;
        if (!id || user?.active === false || user?.enabled === false) return null;
        return {
          id,
          username: user.username || user.name || email,
          avatarUrl: user.profileImageUrl || user.avatarUrl || null
        };
      }),
      catchError(err => {
        if (err.status !== 404) console.error('❌ Error buscando usuario por correo:', err);
        return of(null);
      })
    );
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
  const token = this.authService.getToken();

  console.log("USER ID:", userId);
  console.log("TOKEN:", token);
  console.log("DATA:", data);

  return this.http.put(
    `${this.baseUrl}/user/${userId}`,
    data,
    {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    }
  );
}
}