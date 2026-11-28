import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';

interface CalendarEnv {
  apiUrl: string;
  calendarUrl?: string;
  calendarWebPath?: string;
}

/**
 * Base de Calendar (con `/api`, sin barra final).
 * - Web desplegada: `calendarWebPath` (`/api`), en el mismo dominio. Firebase Hosting lo reenvía a Cloud Run
 *   (ver `firebase.json`), porque Calendar no manda CORS.
 * - Celular (Capacitor): no hay Hosting de por medio, va directo a `calendarUrl`.
 * - Local: `calendarUrl` (`/calendar-api`, lo resuelve `proxy.conf.cjs`).
 */
export function calendarBaseUrl(env: CalendarEnv = environment as CalendarEnv, native = Capacitor.isNativePlatform()): string {
  if (env.calendarWebPath && !native) return env.calendarWebPath;
  return env.calendarUrl || env.apiUrl;
}
