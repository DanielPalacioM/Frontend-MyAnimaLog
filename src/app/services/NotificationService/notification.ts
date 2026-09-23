import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  AppNotificationDto,
  CreateNotificationPayload,
  NotificationListResponse
} from 'src/app/models/notification.model';
import { Dedupable, dedupeByContent, isNoiseNotification } from 'src/app/shared/utils/notification-text.util';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/notifications`;

  // Contador compartido de no leídas: cualquier pantalla lo puede consumir
  // (ej. el badge de la campana en Home) y se mantiene sincronizado solo,
  // sin depender de que cada pantalla recuerde volver a pedirlo.
  private unreadCountSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  // GET /notifications?userId=...&read=...  (ListByUser)
  // Sin "read" trae todas las notificaciones del usuario (leídas y no leídas).
  getNotifications(read?: boolean): Observable<AppNotificationDto[]> {
    const userId = this.getUserId();
    const params: Record<string, string> = { userId };
    if (read !== undefined) {
      params['read'] = String(read);
    }

    return this.http.get<NotificationListResponse>(this.baseUrl, { params }).pipe(
      map(response => response.notifications || [])
    );
  }

  getUnreadNotifications(): Observable<AppNotificationDto[]> {
    return this.getNotifications(false);
  }

  // Vuelve a pedirle al backend las no leídas y publica el número real en
  // unreadCount$: sin contar "ruido" (login/logout) ni copias duplicadas
  // (el backend a veces mete varias filas idénticas para un mismo evento).
  // Las duplicadas se limpian solas de una vez, así el badge no se queda
  // pegado en un número inflado aunque el usuario nunca abra Notificaciones.
  refreshUnreadCount(): void {
    this.getUnreadNotifications().subscribe({
      next: (list) => {
        const meaningful = list.filter(n => !isNoiseNotification(n));
        const dedupableList: (Dedupable & { dto: AppNotificationDto })[] = meaningful.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          date: new Date(n.sendAt || n.createdAt),
          dto: n
        }));

        const { deduped, redundantIds } = dedupeByContent(dedupableList);
        this.unreadCountSubject.next(deduped.length);

        if (redundantIds.length > 0) {
          forkJoin(redundantIds.map(id => this.patchRead(id))).subscribe({
            error: (err) => console.error('❌ No se pudieron limpiar notificaciones duplicadas:', err)
          });
        }
      },
      error: (err) => console.error('❌ Error actualizando contador de notificaciones:', err)
    });
  }

  // PATCH /notifications/{id}  { userId }  (MarkAsRead), sin efectos
  // secundarios — la usan markAsRead() y markManyAsRead() de abajo.
  private patchRead(id: string): Observable<AppNotificationDto> {
    const userId = this.getUserId();
    return this.http.patch<AppNotificationDto>(`${this.baseUrl}/${id}`, { userId });
  }

  // Marca UNA notificación como leída y refresca el contador compartido para
  // que el badge del Home baje sin que cada pantalla tenga que acordarse de
  // hacerlo por su cuenta.
  markAsRead(id: string): Observable<AppNotificationDto> {
    return this.patchRead(id).pipe(tap(() => this.refreshUnreadCount()));
  }

  // Marca VARIAS como leídas (ej. "Marcar todas") en paralelo y refresca el
  // contador una sola vez al final, en vez de una vez por cada notificación.
  // Cada intento se resuelve por separado (no con un solo forkJoin "todo o
  // nada"): si una sola falla entre cientos, antes se perdían TODAS —
  // ahora las que sí funcionaron quedan marcadas igual.
  markManyAsRead(ids: string[]): Observable<{ id: string; ok: boolean }[]> {
    if (ids.length === 0) return of([]);
    const attempts = ids.map(id =>
      this.patchRead(id).pipe(
        map(() => ({ id, ok: true })),
        catchError(() => of({ id, ok: false }))
      )
    );
    return forkJoin(attempts).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  // POST /notifications  (Send Notification)
  // Usado para recordatorios/alertas creadas manualmente desde el front
  // (el resto de notificaciones — vacunas, calendario, invitaciones, etc.—
  // las genera el backend automáticamente cuando se crean esos recursos).
  createNotification(payload: Omit<CreateNotificationPayload, 'userId'>): Observable<AppNotificationDto> {
    const userId = this.getUserId();
    return this.http.post<AppNotificationDto>(this.baseUrl, { ...payload, userId }).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }
}
