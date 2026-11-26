import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class BypassTunnelInterceptor implements HttpInterceptor {
  /**
   * `bypass-tunnel-reminder` solo sirve para túneles de localtunnel (`*.loca.lt`), que muestran una página de aviso.
   * Mandarlo a cualquier otro servidor obliga a que lo acepte en CORS: el veterinary-service ya no lo acepta (25 nov) y
   * bloqueaba `/veterinary/me/linked-veterinaries`. Por eso solo se agrega cuando la petición va a un túnel.
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!/\.loca\.lt(\/|:|$)/.test(req.url)) return next.handle(req);
    const cloned = req.clone({
      setHeaders: {
        'bypass-tunnel-reminder': 'true'
      }
    });
    return next.handle(cloned);
  }
}