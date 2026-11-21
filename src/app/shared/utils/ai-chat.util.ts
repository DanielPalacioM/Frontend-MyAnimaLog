import { AiError, AiErrorCode } from 'src/app/models/ai-chat.model';

/** Adjuntos del chat: imágenes y PDF, como los documentos de la app. */
export const AI_MAX_FILES = 5;
export const AI_MAX_BYTES = 10 * 1024 * 1024;
export const AI_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
/** Para el `accept` del input de archivos. */
export const AI_ACCEPT = '.pdf,image/jpeg,image/png,image/webp';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Devuelve el motivo por el que el archivo no se puede adjuntar, o `null` si sirve. */
export function validateAttachment(file: { name: string; size: number; type: string }, currentCount: number): string | null {
  if (currentCount >= AI_MAX_FILES) return `Máximo ${AI_MAX_FILES} archivos por mensaje.`;
  if (!AI_ALLOWED_TYPES.includes(file.type)) return `"${file.name}" no es un PDF ni una imagen (JPG, PNG o WEBP).`;
  if (file.size > AI_MAX_BYTES) return `"${file.name}" pesa ${formatFileSize(file.size)}; el máximo es ${formatFileSize(AI_MAX_BYTES)}.`;
  if (file.size === 0) return `"${file.name}" está vacío.`;
  return null;
}

export function newMessageId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const inline = (s: string) =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

/**
 * Convierte el texto de la IA en HTML seguro con lo mínimo de formato: párrafos, **negrita**, `código`,
 * listas con "-", "*" o "1." y títulos con "#". Todo lo demás se escapa, así que no hay forma de inyectar HTML.
 */
export function formatAiText(text: string): string {
  const out: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.join('<br>')}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`);
    list = null;
  };

  for (const raw of (text ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);

    if (bullet || numbered) {
      flushPara();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push(inline((bullet ?? numbered)![1]));
    } else if (heading) {
      flushPara();
      flushList();
      out.push(`<p><strong>${inline(heading[1])}</strong></p>`);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(inline(line));
    }
  }
  flushPara();
  flushList();
  return out.join('');
}

/** Convierte un error HTTP en un `AiError`. El IA-service manda un `code` estable; si no lo trae se usa el estado. */
export function parseAiError(err: any): AiError {
  const status: number = err?.status ?? 0;
  const body = err?.error;
  const message: string = (typeof body === 'object' && body ? body.message : undefined) ?? err?.message ?? '';
  const backendCode: string | undefined = typeof body === 'object' && body ? body.code : undefined;

  let code: AiErrorCode;
  if (backendCode === 'CONVERSATION_NOT_FOUND') code = 'CONVERSATION_NOT_FOUND';
  else if (backendCode === 'PENDING_ACTION_NOT_FOUND') code = 'ACTION_NOT_FOUND';
  else if (backendCode === 'UNSUPPORTED_ATTACHMENT_TYPE') code = 'UNSUPPORTED';
  else if (backendCode === 'INVALID_REQUEST') code = 'INVALID_REQUEST';
  else if (status === 0) code = 'NETWORK';
  else if (status === 404 || status === 405 || status === 501) code = 'NOT_AVAILABLE';
  else if (status === 413) code = 'TOO_LARGE';
  else if (status === 415) code = 'UNSUPPORTED';
  else if (status === 429) code = 'RATE_LIMIT';
  else if (status === 502 || status === 503 || status === 504) code = 'NOT_AVAILABLE';
  else code = 'UNKNOWN';
  return { code, status, message };
}

export function aiErrorText(e: AiError): string {
  switch (e.code) {
    case 'NOT_AVAILABLE':
      return 'Todavía no puedo responder: el servicio de IA no está disponible en este momento. Intenta de nuevo más tarde.';
    case 'CONVERSATION_NOT_FOUND':
      return 'No encontré esa conversación. Empecemos una nueva: vuelve a escribirme.';
    case 'ACTION_NOT_FOUND':
      return 'Esa acción ya no está disponible (se confirmó, se canceló o venció). Pídemela de nuevo si la necesitas.';
    case 'INVALID_REQUEST':
      return 'Escribe un mensaje o adjunta un archivo para que pueda ayudarte.';
    case 'TOO_LARGE':
      return 'Alguno de los archivos pesa demasiado. Prueba con uno más pequeño (máximo 10 MB).';
    case 'UNSUPPORTED':
      return 'No pude leer ese tipo de archivo. Adjunta un PDF o una imagen (JPG, PNG o WEBP).';
    case 'RATE_LIMIT':
      return 'Me has escrito muy rápido. Espera un momento y vuelve a intentarlo.';
    case 'NETWORK':
      return 'No pude conectarme. Revisa tu conexión e intenta de nuevo.';
    default:
      return 'Algo salió mal al responderte. Intenta de nuevo.';
  }
}

// ---------------------------------------------------------------- Historial de chats

export const DEFAULT_CHAT_TITLE = 'Nuevo chat';

/** Título del chat: el primer mensaje del usuario (corto) o el nombre del primer archivo. */
export function chatTitle(messages: { role: string; text: string; attachments?: { name: string }[]; intro?: boolean; error?: boolean }[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return DEFAULT_CHAT_TITLE;
  const text = first.text.replace(/\s+/g, ' ').trim();
  if (text) return text.length > 42 ? `${text.slice(0, 41).replace(/\s+$/, '')}…` : text;
  const file = first.attachments?.[0]?.name;
  return file ? `Documento: ${file.length > 30 ? `${file.slice(0, 29)}…` : file}` : DEFAULT_CHAT_TITLE;
}

/** Minúsculas y sin tildes, para buscar sin importar cómo se escribió. */
export function normalizeSearch(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Busca en el título y en el texto de los mensajes. Sin búsqueda, devuelve todos. */
export function searchChats<T extends { title: string; messages: { text: string }[] }>(chats: T[], query: string): T[] {
  const q = normalizeSearch(query);
  if (!q) return chats;
  return chats.filter(c => normalizeSearch(c.title).includes(q) || c.messages.some(m => normalizeSearch(m.text).includes(q)));
}

export interface ChatGroup<T> { label: string; chats: T[]; }

/** Agrupa por antigüedad: Hoy, Ayer, Últimos 7 días y Anteriores. Respeta el orden recibido. */
export function groupChats<T extends { updatedAt: string }>(chats: T[], now = new Date()): ChatGroup<T>[] {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const DAY = 86_400_000;
  const buckets: ChatGroup<T>[] = [
    { label: 'Hoy', chats: [] },
    { label: 'Ayer', chats: [] },
    { label: 'Últimos 7 días', chats: [] },
    { label: 'Anteriores', chats: [] },
  ];
  for (const c of chats) {
    const diff = Math.round((today - startOfDay(new Date(c.updatedAt))) / DAY);
    buckets[diff <= 0 ? 0 : diff === 1 ? 1 : diff <= 7 ? 2 : 3].chats.push(c);
  }
  return buckets.filter(b => b.chats.length);
}

/** Hora si es de hoy, "3 nov" si no. */
export function chatWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return same
    ? d.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------- Modo seguimiento: dónde está el usuario

export interface ScreenInfo { key: string; label: string; petId?: string; }

/** Nombre de la pantalla a partir de la URL, para que la IA sepa dónde está el usuario. */
export function describeScreen(url: string): ScreenInfo {
  const path = (url || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const seg = path.split('/').filter(Boolean);
  const first = seg[0] ?? '';
  switch (first) {
    case 'home': return { key: 'home', label: 'Inicio' };
    case 'pet-profile': return seg[1] ? { key: 'pet-profile', label: 'Perfil de mascota', petId: seg[1] } : { key: 'pet-profile', label: 'Perfil de mascota' };
    case 'pets': return { key: 'pet-edit', label: 'Editar mascota', petId: seg[1] };
    case 'add-pet': return { key: 'add-pet', label: 'Agregar mascota' };
    case 'calendar': return { key: 'calendar', label: 'Calendario' };
    case 'shared-profiles':
    case 'shared-profiles-home': return { key: 'shared-profiles', label: 'Perfiles compartidos' };
    case 'vet': return { key: 'vet', label: 'Veterinarias' };
    case 'pet-clinics': return { key: 'pet-clinics', label: 'Clínicas con acceso', petId: seg[1] };
    case 'maps': return { key: 'maps', label: 'Mapa de veterinarias' };
    case 'medical-history': return { key: 'medical-history', label: 'Historial médico' };
    case 'vaccine-timeline':
    case 'vaccine-info':
    case 'register-vaccine': return { key: 'vaccines', label: 'Vacunas' };
    case 'documents': return { key: 'documents', label: 'Documentos' };
    case 'notifications': return { key: 'notifications', label: 'Notificaciones' };
    case 'profile': return { key: 'profile', label: 'Mi perfil' };
    default: return { key: first || 'home', label: 'la app' };
  }
}

/** Sugerencias del mini chat según la pantalla. Todas son cosas que el IA-service sabe hacer. */
export function suggestionsFor(screenKey: string): string[] {
  switch (screenKey) {
    case 'pet-profile':
    case 'medical-history':
    case 'vaccines':
      return ['Registra una vacuna', 'Explícame el último examen', '¿Cuáles son mis mascotas?'];
    case 'calendar':
      return ['Agéndame una cita', '¿Cuáles son mis mascotas?'];
    case 'vet':
    case 'maps':
    case 'pet-clinics':
      return ['Agéndame una cita con mi veterinaria', '¿Cómo me vinculo a una veterinaria?'];
    case 'add-pet':
      return ['Registra una mascota nueva', '¿Qué raza parece ser?'];
    default:
      return ['¿Cuáles son mis mascotas?', 'Registra una mascota nueva', 'Agéndame una cita'];
  }
}
