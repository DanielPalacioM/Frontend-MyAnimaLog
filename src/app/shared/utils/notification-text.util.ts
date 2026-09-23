import { AppNotificationDto } from 'src/app/models/notification.model';

// ============================================================
// FILTRO DE "RUIDO"
// ============================================================
// El backend de auth (login/logout) manda notificaciones tipo GENERAL igual
// que el de calendario, así que no hay un "type" para distinguirlas. Mientras
// el backend no las separe en su propio tipo, se filtran aquí por texto.
// Si aparece alguna que no cae en estos patrones, hay que agregar su frase
// exacta a esta lista.
const NOISE_PATTERNS: RegExp[] = [
  /inicio de sesi[oó]n/i,
  /sesi[oó]n iniciada/i,
  /has iniciado sesi[oó]n/i,
  /nuevo inicio de sesi[oó]n/i,
  /cierre de sesi[oó]n/i,
  /sesi[oó]n cerrada/i,
  /has cerrado sesi[oó]n/i,
  /\blogin\b/i,
  /\blogout\b/i,
  /signed in/i,
  /signed out/i,
];

export function isNoiseNotification(n: Pick<AppNotificationDto, 'title' | 'message'>): boolean {
  const text = `${n.title} ${n.message}`;
  return NOISE_PATTERNS.some(re => re.test(text));
}

// ============================================================
// LEGIBILIDAD (reemplaza los ids crudos que manda el backend por nombres)
// ============================================================
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;

function cleanupText(text: string, idToName: Map<string, string>): string {
  return text
    // Casos conocidos y frecuentes del backend de calendario:
    .replace(/al calendario de mascota\s*\(([0-9a-fA-F-]{36})\)/i, (_m, id) =>
      `al calendario de ${idToName.get(id) || 'tu mascota'}`)
    .replace(/al calendario de usuario\s*\([0-9a-fA-F-]{36}\)/i, 'a tu calendario')
    // Cualquier otro id suelto: se cambia por el nombre si se conoce, si no
    // se elimina (nunca se debe mostrar un uuid crudo al usuario).
    .replace(UUID_RE, (id) => idToName.get(id) || '')
    // Limpieza de los restos que deja un reemplazo vacío ("de :", "()", etc).
    .replace(/\bde\s*:/gi, ':')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+:/g, ':')
    .trim();
}

export function humanizeNotification(
  n: Pick<AppNotificationDto, 'title' | 'message'>,
  idToName: Map<string, string>
): { title: string; message: string } {
  return {
    title: cleanupText(n.title, idToName),
    message: cleanupText(n.message, idToName)
  };
}

// ============================================================
// DEDUPLICADO (el backend a veces inserta varias copias exactas de la misma
// notificación para un mismo evento/recordatorio)
// ============================================================
export interface Dedupable {
  id: string;
  type: string;
  title: string;
  message: string;
  date: Date;
}

// Agrupa por (type, título, mensaje) EXACTOS y se queda con la más reciente
// de cada grupo. Se usa tanto para la lista de Notificaciones como para el
// contador del Home, así ninguno de los dos infla el número con copias.
export function dedupeByContent<T extends Dedupable>(list: T[]): { deduped: T[]; redundantIds: string[] } {
  const groups = new Map<string, T[]>();

  for (const n of list) {
    const key = `${n.type}::${n.title}::${n.message}`;
    const group = groups.get(key);
    if (group) {
      group.push(n);
    } else {
      groups.set(key, [n]);
    }
  }

  const deduped: T[] = [];
  const redundantIds: string[] = [];

  groups.forEach(group => {
    if (group.length === 1) {
      deduped.push(group[0]);
      return;
    }
    group.sort((a, b) => b.date.getTime() - a.date.getTime());
    deduped.push(group[0]);
    redundantIds.push(...group.slice(1).map(n => n.id));
  });

  return { deduped, redundantIds };
}
