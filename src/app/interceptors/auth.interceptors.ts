import { Injectable, Injector } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/authServices/auth';
import { environment } from 'src/environments/environment';

// Rutas de auth que no llevan token ni disparan refresh (login, refresh, registro...).
const PUBLIC_AUTH_PATHS = [
  '/auth/local',
  '/auth/google',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/request-password-reset',
  '/auth/reset-password',
  '/user/register'
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // AuthService usa HttpClient: se pide perezosamente para no crear un ciclo de inyección.
  constructor(private injector: Injector) {}

  private get auth(): AuthService {
    return this.injector.get(AuthService);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (PUBLIC_AUTH_PATHS.some(path => req.url.includes(path))) {
      return next.handle(req);
    }

    // Logout lleva el token, pero un 401 ahí no debe intentar renovar la sesión.
    // Lo mismo para URLs que no son del gateway: se manda el token como antes, sin refresh.
    if (req.url.includes('/auth/logout') || !req.url.startsWith(environment.apiUrl)) {
      return next.handle(this.withToken(req, this.auth.getToken()));
    }

    // Si el token está por vencer, se renueva antes de mandar la petición.
    if (this.auth.getRefreshToken() && this.auth.isTokenExpiringSoon()) {
      return this.auth.refreshSession().pipe(
        catchError(() => {
          this.auth.clearSession();
          return throwError(() => new HttpErrorResponse({ status: 401, url: req.url }));
        }),
        switchMap(token => this.sendWithRetry(req, next, token, true))
      );
    }

    return this.sendWithRetry(req, next, this.auth.getToken(), false);
  }

  // Manda la petición; ante un 401 hace un único refresh y la reintenta UNA vez.
  private sendWithRetry(
    req: HttpRequest<any>,
    next: HttpHandler,
    token: string | null,
    alreadyRefreshed: boolean
  ): Observable<HttpEvent<any>> {
    return next.handle(this.withToken(req, token)).pipe(
      catchError((err: unknown) => {
        const unauthorized = err instanceof HttpErrorResponse && err.status === 401;
        if (!unauthorized || alreadyRefreshed || !this.auth.getRefreshToken()) {
          // Sesión vieja sin refresh token: el 401 significa que hay que volver a entrar.
          if (unauthorized && !this.auth.getRefreshToken() && this.auth.getToken()) {
            this.auth.clearSession();
          }
          return throwError(() => err);
        }

        return this.auth.refreshSession().pipe(
          catchError(refreshErr => {
            console.error('❌ No se pudo renovar la sesión', refreshErr);
            this.auth.clearSession();
            return throwError(() => err);
          }),
          switchMap(newToken => next.handle(this.withToken(req, newToken)))
        );
      })
    );
  }

  private withToken(req: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (!token) return req;
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
