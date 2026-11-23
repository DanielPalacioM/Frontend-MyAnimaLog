import {
  Appointment,
  AppointmentError,
  AppointmentErrorCode,
  AppointmentStatus,
  DaySlots,
  TimeSlot,
} from 'src/app/models/appointment.model';

/** Colombia no tiene horario de verano: las franjas se arman siempre con -05:00, sin importar la zona del teléfono. */
export const CLINIC_TZ = 'America/Bogota';
const OFFSET = '-05:00';

/** Si el backend no manda `cancellableUntil`, el dueño cancela hasta 24 h antes (colección de Calendar). */
export const DEFAULT_CANCEL_HOURS = 24;
/** El backend no ofrece franjas con menos de 1 hora de anticipación (`422 SLOT_TOO_SOON`). */
export const MIN_LEAD_MINUTES = 60;
/** Calendar rechaza rangos de más de 31 días: se pide de a 30. */
export const RANGE_DAYS = 30;

const HOUR = 3_600_000;
const MINUTE = 60_000;
const DAY = 86_400_000;

// ---------------------------------------------------------------- Fechas (hora de Bogotá)

/** `YYYY-MM-DD` de un instante, en hora de Bogotá. */
export function dateKey(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: CLINIC_TZ });
}

/** Instante ISO de una fecha y hora de Bogotá: `slotIso('2026-12-07', '09:30')`. */
export function slotIso(key: string, hhmm: string): string {
  return new Date(`${key}T${hhmm}:00${OFFSET}`).toISOString();
}

/** Suma días a una `YYYY-MM-DD` sin pasar por la zona del dispositivo. */
export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKey(d);
}

/** 0 = domingo … 6 = sábado, del día `YYYY-MM-DD`. */
export function weekdayOf(key: string): number {
  return new Date(`${key}T12:00:00${OFFSET}`).getUTCDay();
}

/** "9:00 a. m." */
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CLINIC_TZ });
}

/** "jueves 16 de oct" */
export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', timeZone: CLINIC_TZ });
}

/** "Hoy", "Mañana" o "jue 16 oct" para la fila de la cita. */
export function dayShort(iso: string, now: number = Date.now()): string {
  const key = dateKey(iso);
  if (key === dateKey(now)) return 'Hoy';
  if (key === dateKey(now + DAY)) return 'Mañana';
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: CLINIC_TZ }).replace(/\./g, '');
}

/** Letra y número de la tira de 5 días: `{ name: 'jue', num: 16 }`. */
export function stripDay(key: string): { name: string; num: number } {
  const d = new Date(`${key}T12:00:00${OFFSET}`);
  return {
    name: d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: CLINIC_TZ }).replace(/\./g, ''),
    num: Number(key.slice(8, 10)),
  };
}

export function money(n: number | null | undefined): string {
  return n == null ? '' : `$${Math.round(n).toLocaleString('es-CO')}`;
}

export function duration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ---------------------------------------------------------------- Franjas

/**
 * Cuadrícula de reserva mientras no exista `GET …/availability`: lunes a viernes de 8 a 12 y de 2 a 6, sábado de 8 a 12,
 * domingo cerrado, cada 30 minutos. Es solo una guía para elegir: la clínica confirma y el servidor valida el choque
 * (`409 SLOT_UNAVAILABLE`). Cuando el endpoint exista, `AppointmentService` usa sus franjas y esto deja de usarse.
 */
export function fallbackDay(key: string, durationMinutes: number): DaySlots {
  const dow = weekdayOf(key);
  const ranges: [string, string][] =
    dow === 0 ? [] : dow === 6 ? [['08:00', '12:00']] : [['08:00', '12:00'], ['14:00', '18:00']];
  const slots: TimeSlot[] = [];
  const need = Math.max(durationMinutes, 1) * MINUTE;
  for (const [from, to] of ranges) {
    const end = new Date(slotIso(key, to)).getTime();
    for (let t = new Date(slotIso(key, from)).getTime(); t + need <= end; t += 30 * MINUTE) {
      slots.push({ startsAt: new Date(t).toISOString(), endsAt: new Date(t + need).toISOString(), employeeId: '', employeeName: '' });
    }
  }
  return { date: key, slots, closed: ranges.length === 0 };
}

export function fallbackDays(fromKey: string, days: number, durationMinutes: number): DaySlots[] {
  return Array.from({ length: days }, (_, i) => fallbackDay(addDaysKey(fromKey, i), durationMinutes));
}

/** ¿La franja todavía se puede pedir? (no pasada y con la anticipación mínima). */
export function slotBookable(slot: TimeSlot, now: number = Date.now()): boolean {
  return new Date(slot.startsAt).getTime() >= now + MIN_LEAD_MINUTES * MINUTE;
}

/** Primer día de la tira que tiene alguna franja reservable (para abrirla ya con un día útil). */
export function firstBookableDay(days: DaySlots[], now: number = Date.now()): string | null {
  return days.find((d) => d.slots.some((s) => slotBookable(s, now)))?.date ?? null;
}

// ---------------------------------------------------------------- Estados de la cita

export interface StatusView {
  label: string;
  icon: string;
  tone: 'warn' | 'main' | 'ok' | 'teal' | 'muted' | 'bad';
}

/** Texto, ícono y tono del chip (DISENO §4: el estado nunca va solo en color). */
export const STATUS_VIEW: Record<AppointmentStatus, StatusView> = {
  REQUESTED: { label: 'Pendiente de confirmación', icon: 'time-outline', tone: 'warn' },
  CONFIRMED: { label: 'Confirmada', icon: 'checkmark-circle-outline', tone: 'main' },
  CHECKED_IN: { label: 'En la clínica', icon: 'location-outline', tone: 'teal' },
  COMPLETED: { label: 'Atendida', icon: 'checkmark-done-outline', tone: 'ok' },
  CANCELLED: { label: 'Cancelada', icon: 'close-circle-outline', tone: 'muted' },
  NO_SHOW: { label: 'No asististe', icon: 'alert-circle-outline', tone: 'muted' },
  REJECTED: { label: 'Rechazada', icon: 'close-circle-outline', tone: 'bad' },
};

const OPEN: AppointmentStatus[] = ['REQUESTED', 'CONFIRMED', 'CHECKED_IN'];

/** La cita sigue viva (se puede esperar, mover o cancelar). */
export const isOpen = (a: Pick<Appointment, 'status'>): boolean => OPEN.includes(a.status);

/** Hasta cuándo puede cancelar el dueño: lo que diga el backend o `startsAt − 24 h`. */
export function cancellableUntil(a: Pick<Appointment, 'startsAt' | 'cancellableUntil'>): number {
  return a.cancellableUntil ? new Date(a.cancellableUntil).getTime() : new Date(a.startsAt).getTime() - DEFAULT_CANCEL_HOURS * HOUR;
}

export function canCancel(a: Appointment, now: number = Date.now()): boolean {
  return isOpen(a) && a.status !== 'CHECKED_IN' && now <= cancellableUntil(a);
}

/** Reprogramar sigue la misma regla de plazo que cancelar. */
export const canReschedule = canCancel;

/** Por qué no se puede cancelar o mover (se muestra en vez de dejar el botón mudo). */
export function whyNotCancellable(a: Appointment, now: number = Date.now()): string {
  if (!isOpen(a)) return '';
  if (a.status === 'CHECKED_IN') return 'Ya estás en la clínica.';
  if (now > cancellableUntil(a)) return 'Ya pasó el plazo para cancelar o mover esta cita por la app. Comunícate con la clínica.';
  return '';
}

/** Próximas (de la más cercana a la más lejana) y anteriores (de la más reciente a la más antigua). */
export function splitAppointments(list: Appointment[], now: number = Date.now()): { upcoming: Appointment[]; past: Appointment[] } {
  const upcoming = list.filter((a) => isOpen(a) && new Date(a.endsAt || a.startsAt).getTime() >= now);
  const ids = new Set(upcoming.map((a) => a.id));
  const past = list.filter((a) => !ids.has(a.id));
  return {
    upcoming: upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    past: past.sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  };
}

/** Rangos `[from, to)` de a lo sumo 30 días para pedir `me/appointments` sin pasar el límite del servidor. */
export function monthRanges(now: number, daysBack: number, daysForward: number): { from: string; to: string }[] {
  const startDay = new Date(slotIso(dateKey(now), '00:00')).getTime();
  const out: { from: string; to: string }[] = [];
  for (let a = startDay - daysBack * DAY; a < startDay + daysForward * DAY; a += RANGE_DAYS * DAY) {
    out.push({ from: new Date(a).toISOString(), to: new Date(Math.min(a + RANGE_DAYS * DAY, startDay + daysForward * DAY)).toISOString() });
  }
  return out;
}

// ---------------------------------------------------------------- Notificaciones

/** Los avisos `APPOINTMENT_*` abren Mis citas. */
export const isAppointmentNotification = (type: string): boolean => /^APPOINTMENT_/.test(type ?? '');

// ---------------------------------------------------------------- Errores

const KNOWN: AppointmentErrorCode[] = [
  'SLOT_UNAVAILABLE', 'SLOT_TAKEN', 'SLOT_TOO_SOON', 'PET_NOT_OWNED', 'PET_NOT_SHARED', 'ONLINE_BOOKING_DISABLED',
  'VETERINARY_NOT_ACTIVE', 'FEATURE_NOT_IN_PLAN', 'CANCELLATION_WINDOW_CLOSED', 'OWNER_TOKEN_REQUIRED', 'MISSING_TOKEN',
  'VALIDATION_ERROR',
];

/** Convierte un HttpErrorResponse en un `AppointmentError` con código estable. */
export function parseAppointmentError(err: any): AppointmentError {
  const status: number = err?.status ?? 0;
  const body = err?.error;
  const raw = typeof body === 'object' && body ? (body.code ?? body.errorCode) : undefined;
  const message: string = (typeof body === 'object' && body ? body.message ?? body.error : undefined) ?? err?.message ?? '';
  let code: AppointmentErrorCode;
  if (KNOWN.includes(raw)) code = raw;
  else if (status === 0) code = 'NETWORK';
  else if (status === 502 || status === 503 || status === 504) code = 'UNAVAILABLE';
  else code = 'UNKNOWN';
  return { code, status, message };
}

/** Texto para el usuario según el error. */
export function appointmentErrorText(e: AppointmentError): { title: string; detail: string } {
  switch (e.code) {
    case 'SLOT_UNAVAILABLE':
    case 'SLOT_TAKEN':
      return { title: 'Esa hora ya no está libre', detail: 'Alguien la tomó antes. Elige otra hora.' };
    case 'SLOT_TOO_SOON':
      return { title: 'Muy cerca de la hora', detail: 'Necesitamos al menos 1 hora de anticipación. Elige una hora más tarde.' };
    case 'PET_NOT_OWNED':
      return { title: 'Esa mascota no es tuya', detail: 'Solo su dueño puede pedir una cita para ella.' };
    case 'PET_NOT_SHARED':
      return { title: 'La clínica aún no ve a tu mascota', detail: 'Compártela con la clínica para pedir la cita.' };
    case 'ONLINE_BOOKING_DISABLED':
    case 'FEATURE_NOT_IN_PLAN':
      return { title: 'Esta clínica no recibe citas por la app', detail: 'Llama a la clínica para agendar.' };
    case 'VETERINARY_NOT_ACTIVE':
      return { title: 'Esta clínica todavía no está disponible', detail: 'Está en revisión o suspendida. Intenta más tarde.' };
    case 'CANCELLATION_WINDOW_CLOSED':
      return { title: 'Ya pasó el plazo', detail: 'Faltan muy pocas horas para la cita. Comunícate con la clínica.' };
    case 'MISSING_TOKEN':
    case 'OWNER_TOKEN_REQUIRED':
      return { title: 'Tu sesión venció', detail: 'Cierra sesión y vuelve a entrar.' };
    case 'NETWORK':
    case 'UNAVAILABLE':
      return { title: 'No pudimos conectar', detail: 'Revisa tu conexión e intenta de nuevo.' };
    default:
      return { title: 'Algo salió mal', detail: 'Intenta de nuevo en un momento.' };
  }
}
