/**
 * Nombre completo y teléfono del dueño (User service, docs NOMBRE_Y_TELEFONO.md).
 * - `fullName`: opcional, 2 a 100 caracteres, letras (con tildes y ñ), espacios, guion y apóstrofe.
 *   Se recorta y se colapsan los espacios. No es único.
 * - `phone`: opcional; el backend lo normaliza a E.164 (+57 por defecto). Aquí solo se filtra lo evidente.
 * - `username` no cambia: único, sin espacios, `^[a-zA-Z0-9_]+$`, 3 a 50.
 * Sirve también para "registrar sin app": el dueño que la clínica registró se crea la cuenta con su nombre y teléfono.
 */

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,50}$/;
const FULL_NAME_RE = /^[\p{L}\p{M}' -]+$/u;

export function normalizeFullName(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

/** Mensaje de error, o null si está bien. Vacío es válido (es opcional). */
export function fullNameError(value: string | null | undefined): string | null {
  const v = normalizeFullName(value);
  if (!v) return null;
  if (v.length < 2) return 'El nombre completo debe tener al menos 2 letras.';
  if (v.length > 100) return 'El nombre completo puede tener máximo 100 caracteres.';
  if (!FULL_NAME_RE.test(v)) return 'El nombre completo solo puede tener letras, espacios, guion (-) y apóstrofe (\').';
  return null;
}

/** Quita espacios, guiones, puntos y paréntesis; conserva el + inicial. */
export function compactPhone(value: string | null | undefined): string {
  const v = (value || '').trim();
  const plus = v.startsWith('+') ? '+' : '';
  return plus + v.replace(/[^\d]/g, '');
}

/** Filtro básico antes de mandar (el backend valida de verdad y responde INVALID_PHONE). Vacío es válido. */
export function phoneError(value: string | null | undefined): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (/[^\d\s()+.-]/.test(raw) || raw.indexOf('+') > 0) return 'El número de teléfono no es válido.';
  const digits = compactPhone(raw).replace('+', '');
  if (digits.length < 7 || digits.length > 15) return 'El número de teléfono no es válido.';
  return null;
}

/** "+573001234567" → "+57 300 123 4567" (solo para mostrar). */
export function formatPhone(value: string | null | undefined): string {
  const v = compactPhone(value);
  const m = /^\+57(\d{3})(\d{3})(\d{4})$/.exec(v);
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : (value || '');
}

/** Errores del User service al registrar o editar el perfil, en español. */
export function userErrorMessage(err: any, fallback = 'No se pudo guardar. Intenta de nuevo.'): string {
  const body = err?.error ?? {};
  if (body.code === 'INVALID_PHONE') return 'El número de teléfono no es válido.';
  if (err?.status === 409) return 'Ese nombre de usuario o correo ya está en uso.';
  const fields = body.field_errors ?? body.errors;
  if (err?.status === 400 && fields && typeof fields === 'object') {
    if (fields.fullName) return 'El nombre completo no es válido: usa solo letras, espacios, guion o apóstrofe.';
    if (fields.phone) return 'El número de teléfono no es válido.';
    if (fields.username) return 'El nombre de usuario solo puede tener letras, números y guion bajo (_), sin espacios.';
    return Object.keys(fields).map(k => String(fields[k])).join('\n');
  }
  if (err?.status === 400 && typeof body.error === 'string') {
    if (/name/i.test(body.error)) return 'El nombre completo no es válido: usa solo letras, espacios, guion o apóstrofe.';
    return body.error;
  }
  return fallback;
}

/** Nombre para mostrar: el backend ya cae al username, pero por si viene vacío. */
export function displayName(profile: { fullName?: string | null; full_name?: string | null; username?: string | null } | null | undefined): string {
  return normalizeFullName(profile?.fullName ?? profile?.full_name) || profile?.username || '';
}
