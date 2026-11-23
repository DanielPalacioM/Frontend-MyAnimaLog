import { VetError, VetErrorCode } from 'src/app/models/veterinary.model';

/** Código de clínica: `VET-` + 8 letras o números (Figma 2031:295). */
const VET_CODE_RE = /^VET-[A-Z0-9]{8}$/;
const VET_CODE_IN_TEXT_RE = /VET-[A-Z0-9]{8}/i;

export function normalizeVetCode(raw: string): string {
  return (raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

/** Los 8 caracteres sin el prefijo: el panel de la clínica puede mostrar el código así (`KKKKD9UD`). */
const BARE_CODE_RE = /^[A-Z0-9]{8}$/;

export function isValidVetCode(raw: string): boolean {
  const code = normalizeVetCode(raw);
  return VET_CODE_RE.test(code) || BARE_CODE_RE.test(code);
}

/** El código con `VET-` delante (formato documentado), aunque lo hayan escrito sin él. */
export function withVetPrefix(raw: string): string {
  const code = normalizeVetCode(raw);
  return BARE_CODE_RE.test(code) ? `VET-${code}` : code;
}

/** Las formas en que se prueba un código ante el servidor: la documentada primero y, si tiene prefijo, también sin él. */
export function vetCodeForms(raw: string): string[] {
  const full = withVetPrefix(raw);
  return VET_CODE_RE.test(full) ? [full, full.slice(4)] : [full];
}

/**
 * Saca el código de un texto cualquiera: el QR de recepción puede traer solo el código
 * (con o sin `VET-`) o un enlace de invitación que lo lleva dentro. Devuelve siempre `VET-XXXXXXXX`.
 */
export function extractVetCode(text: string): string | null {
  const raw = (text ?? '').trim();
  const m = raw.match(VET_CODE_IN_TEXT_RE);
  if (m) return m[0].toUpperCase();
  return BARE_CODE_RE.test(raw.toUpperCase()) ? `VET-${raw.toUpperCase()}` : null;
}

/** "Clínica Patitas" → "CP". Para el avatar cuando la clínica no tiene logo. */
export function vetInitials(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'V';
  const skip = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y']);
  const meaningful = words.filter(w => !skip.has(w.toLowerCase()));
  const base = meaningful.length ? meaningful : words;
  return base.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const KNOWN_CODES: VetErrorCode[] = [
  'INVALID_INVITE_CODE', 'LINK_CODE_NOT_FOUND', 'PET_NOT_OWNED', 'NOT_LINKED_TO_VETERINARY',
  'CLINIC_NOT_ACTIVE', 'USER_NOT_LINKED', 'VETERINARY_NOT_FOUND', 'VALIDATION_ERROR',
  'EXTERNAL_SERVICE_UNAVAILABLE',
];

/** Convierte un HttpErrorResponse (o cualquier error) en un `VetError` con código estable. */
export function parseVetError(err: any): VetError {
  const status: number = err?.status ?? 0;
  const body = err?.error;
  const rawCode = typeof body === 'object' && body ? (body.code ?? body.errorCode) : undefined;
  const message: string = (typeof body === 'object' && body ? body.message : undefined) ?? err?.message ?? '';

  let code: VetErrorCode;
  if (KNOWN_CODES.includes(rawCode)) code = rawCode;
  else if (status === 0) code = 'NETWORK';
  else if (status === 503 || status === 502 || status === 504) code = 'EXTERNAL_SERVICE_UNAVAILABLE';
  else code = 'UNKNOWN';

  return { code, status, message };
}

/** Texto para el usuario según el error (títulos y apoyo de Figma 2031:295). */
export function vetErrorText(e: VetError): { title: string; detail: string } {
  switch (e.code) {
    case 'INVALID_INVITE_CODE':
    case 'LINK_CODE_NOT_FOUND':
      return {
        title: 'Código no válido',
        detail: 'Revisa que empiece por VET- y tenga 8 letras o números. Si es correcto, la clínica puede estar en revisión: pregunta en recepción.',
      };
    case 'CLINIC_NOT_ACTIVE':
      return {
        title: 'Esta clínica todavía no está disponible',
        detail: 'Está en revisión o suspendida. Pregunta en recepción o intenta más tarde.',
      };
    case 'PET_NOT_OWNED':
      return { title: 'No puedes compartir esa mascota', detail: 'Solo su dueño puede compartirla con una clínica.' };
    case 'NOT_LINKED_TO_VETERINARY':
    case 'USER_NOT_LINKED':
      return { title: 'Ya no estás vinculado a esta clínica', detail: 'Vuelve a vincularte con su código.' };
    case 'NETWORK':
    case 'EXTERNAL_SERVICE_UNAVAILABLE':
      return { title: 'No pudimos conectar', detail: 'Revisa tu conexión e intenta de nuevo.' };
    default:
      return { title: 'Algo salió mal', detail: 'Intenta de nuevo en un momento.' };
  }
}

/** "Gato · Siamés · 5 meses" para las filas de mascotas. */
export function petSubtitle(p: { species?: string; breed?: string; ageMonths?: number | null }): string {
  const parts: string[] = [];
  if (p.species) parts.push(p.species);
  if (p.breed) parts.push(p.breed);
  const m = p.ageMonths;
  if (m != null && m >= 0) {
    if (m < 12) parts.push(m === 1 ? '1 mes' : `${m} meses`);
    else {
      const y = Math.floor(m / 12);
      parts.push(y === 1 ? '1 año' : `${y} años`);
    }
  }
  return parts.join(' · ');
}

/** Fecha visible (CLAUDE.md): "3 mar 2026". */
export function vetDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
