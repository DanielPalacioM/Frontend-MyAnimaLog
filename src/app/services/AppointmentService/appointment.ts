import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { calendarBaseUrl } from 'src/app/shared/utils/calendar-url.util';
import {
  Appointment,
  AppointmentStatus,
  Availability,
  BookableService,
  BookingRequest,
  DaySlots,
  TimeSlot,
} from 'src/app/models/appointment.model';
import {
  addDaysKey,
  dateKey,
  fallbackDays,
  monthRanges,
  parseAppointmentError,
} from 'src/app/shared/utils/appointment.util';

/** Días que se piden de una vez para la tira de fechas (el contrato propone un máximo de 14). */
export const AVAILABILITY_WINDOW_DAYS = 5;

/**
 * Citas del dueño con una clínica (calendar-service). Token normal; el dueño sale del token, nunca del body.
 * Todos los errores salen como `AppointmentError`.
 *
 * **Dónde vive.** Calendar es un servicio aparte del gateway. `environment.calendarUrl` (con `/api`, sin barra final)
 * apunta a él; vacío = el gateway (`apiUrl`), que hoy no publica estas rutas. Para conectar basta con llenar esa URL,
 * y que Calendar permita CORS desde la app (en móvil nativo no hace falta).
 *
 * **Contrato:** `GET /veterinaries/{id}/services`, `GET /veterinaries/{id}/availability`, `POST /veterinaries/{id}/appointment-requests`,
 * `GET /me/appointments`, `PATCH /veterinaries/{id}/appointments/{aid}/cancel|reschedule`.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly baseUrl: string = calendarBaseUrl();

  constructor(private http: HttpClient) {}

  /** Servicios que la clínica deja reservar en línea. */
  getServices(veterinaryId: string): Observable<BookableService[]> {
    return this.http.get<any>(`${this.baseUrl}/veterinaries/${veterinaryId}/services`).pipe(
      map(r => (Array.isArray(r) ? r : r?.services ?? []).map((s: any) => this.toService(s))),
      this.mapError()
    );
  }

  /**
   * Franjas libres desde `fromKey` (`YYYY-MM-DD`, hora de Bogotá). Si el servidor aún no tiene `availability`
   * (404/405), usa una cuadrícula local y lo dice en `source: 'grid'` para que la pantalla avise que la clínica confirma.
   */
  getAvailability(veterinaryId: string, serviceId: string, durationMinutes: number, fromKey: string, days = AVAILABILITY_WINDOW_DAYS): Observable<Availability> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('from', fromKey)
      .set('to', addDaysKey(fromKey, days - 1));
    return this.http.get<any>(`${this.baseUrl}/veterinaries/${veterinaryId}/availability`, { params }).pipe(
      map((r): Availability => ({ days: this.toDays(r, fromKey, days), source: 'server' })),
      catchError(err => {
        if (err?.status === 404 || err?.status === 405 || err?.status === 501) {
          return of<Availability>({ days: fallbackDays(fromKey, days, durationMinutes), source: 'grid' });
        }
        return throwError(() => err);
      }),
      this.mapError()
    );
  }

  /** Pedir cita. Nace `REQUESTED` si la clínica confirma cada una, o `CONFIRMED`. `409 SLOT_UNAVAILABLE` si la hora se ocupó. */
  request(veterinaryId: string, body: BookingRequest): Observable<Appointment> {
    const payload: BookingRequest = { serviceId: body.serviceId, petId: body.petId, startsAt: body.startsAt };
    if (body.notes?.trim()) payload.notes = body.notes.trim();
    return this.http
      .post<any>(`${this.baseUrl}/veterinaries/${veterinaryId}/appointment-requests`, payload)
      .pipe(map(r => this.toAppointment(r, veterinaryId)), this.mapError());
  }

  /** Mis citas en todas las clínicas entre dos fechas (máx. 30 días por llamada). */
  getRange(from: string, to: string): Observable<Appointment[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<any>(`${this.baseUrl}/me/appointments`, { params }).pipe(
      map(r => (Array.isArray(r) ? r : r?.appointments ?? []).map((a: any) => this.toAppointment(a))),
      this.mapError()
    );
  }

  /** Los últimos 30 días y los próximos 60 por defecto (de a 30 por llamada, que es el límite del servidor), sin repetidos. */
  getMine(now: number = Date.now(), pastDays = 30, futureDays = 60): Observable<Appointment[]> {
    const calls = monthRanges(now, pastDays, futureDays).map(r => this.getRange(r.from, r.to));
    return forkJoin(calls).pipe(
      map(parts => {
        const byId = new Map<string, Appointment>();
        for (const a of ([] as Appointment[]).concat(...parts)) byId.set(a.id, a);
        return [...byId.values()];
      })
    );
  }

  /** Cancelar. El dueño solo puede con anticipación (`409 CANCELLATION_WINDOW_CLOSED`). */
  cancel(veterinaryId: string, appointmentId: string, reason?: string): Observable<Appointment> {
    const body = reason?.trim() ? { reason: reason.trim() } : {};
    return this.http
      .patch<any>(`${this.baseUrl}/veterinaries/${veterinaryId}/appointments/${appointmentId}/cancel`, body)
      .pipe(map(r => this.toAppointment(r, veterinaryId)), this.mapError());
  }

  /** Reprogramar a otra hora (el servidor vuelve a validar la disponibilidad: `409 SLOT_UNAVAILABLE`). */
  reschedule(veterinaryId: string, appointmentId: string, startsAt: string): Observable<Appointment> {
    return this.http
      .patch<any>(`${this.baseUrl}/veterinaries/${veterinaryId}/appointments/${appointmentId}/reschedule`, { startsAt })
      .pipe(map(r => this.toAppointment(r, veterinaryId)), this.mapError());
  }

  // ---------- normalización (el backend mezcla camelCase y snake_case, y plano o anidado) ----------

  private mapError<T>() {
    return catchError<T, Observable<never>>(err => throwError(() => parseAppointmentError(err)));
  }

  private toService(s: any): BookableService {
    return {
      id: s?.id ?? '',
      name: s?.name ?? '',
      durationMinutes: Number(s?.durationMinutes ?? s?.duration_minutes ?? 30),
      price: s?.price == null ? null : Number(s.price),
    };
  }

  private toSlot(s: any): TimeSlot {
    return {
      startsAt: s?.startsAt ?? s?.starts_at ?? '',
      endsAt: s?.endsAt ?? s?.ends_at ?? '',
      employeeId: s?.employeeId ?? s?.employee_id ?? '',
      employeeName: s?.employeeName ?? s?.employee_name ?? '',
    };
  }

  /** Acepta `{ days: [{ date, slots }] }` (contrato propuesto) o una lista plana de franjas (CAL-04). */
  private toDays(r: any, fromKey: string, days: number): DaySlots[] {
    const grouped = new Map<string, TimeSlot[]>();
    if (Array.isArray(r?.days)) {
      for (const d of r.days) grouped.set(d?.date, (d?.slots ?? []).map((s: any) => this.toSlot(s)));
    } else {
      for (const s of (Array.isArray(r) ? r : r?.slots ?? []).map((x: any) => this.toSlot(x))) {
        const key = dateKey(s.startsAt);
        grouped.set(key, [...(grouped.get(key) ?? []), s]);
      }
    }
    return Array.from({ length: days }, (_, i) => {
      const key = addDaysKey(fromKey, i);
      const slots = (grouped.get(key) ?? []).filter(s => s.startsAt).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      return { date: key, slots, closed: slots.length === 0 };
    });
  }

  toAppointment(a: any, fallbackVetId = ''): Appointment {
    const vet = a?.veterinary ?? {};
    const pet = a?.pet ?? {};
    const service = a?.service ?? {};
    const employee = a?.employee ?? {};
    const status = String(a?.status ?? 'REQUESTED').toUpperCase() as AppointmentStatus;
    return {
      id: a?.id ?? '',
      veterinaryId: a?.veterinaryId ?? a?.veterinary_id ?? vet.id ?? fallbackVetId,
      clinicName: a?.clinicName ?? a?.clinic_name ?? a?.veterinaryName ?? vet.name ?? '',
      clinicLogoUrl: a?.clinicLogoUrl ?? vet.logoUrl ?? null,
      address: a?.address ?? vet.address ?? '',
      petId: a?.petId ?? a?.pet_id ?? pet.id ?? '',
      petName: a?.petName ?? a?.pet_name ?? pet.name ?? '',
      serviceId: a?.serviceId ?? a?.service_id ?? service.id ?? '',
      serviceName: a?.serviceName ?? a?.service_name ?? service.name ?? '',
      durationMinutes: Number(a?.durationMinutes ?? a?.duration_minutes ?? service.durationMinutes ?? 30),
      price: (a?.price ?? service.price) == null ? null : Number(a?.price ?? service.price),
      employeeName: a?.employeeName ?? a?.employee_name ?? employee.name ?? '',
      startsAt: a?.startsAt ?? a?.starts_at ?? '',
      endsAt: a?.endsAt ?? a?.ends_at ?? '',
      status,
      origin: String(a?.origin ?? 'APP').toUpperCase() === 'CLINIC' ? 'CLINIC' : 'APP',
      notes: a?.notes ?? '',
      cancellationReason: a?.cancellationReason ?? a?.cancellation_reason ?? '',
      cancelledBy: (a?.cancelledBy ?? a?.cancelled_by ?? '') as Appointment['cancelledBy'],
      cancellableUntil: a?.cancellableUntil ?? a?.cancellable_until ?? null,
    };
  }
}
