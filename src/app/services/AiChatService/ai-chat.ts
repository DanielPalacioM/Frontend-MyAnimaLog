import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AiChat, AiContext, AiMessage, AiPendingAction, AiReply } from 'src/app/models/ai-chat.model';
import { chatTitle, newMessageId, parseAiError } from 'src/app/shared/utils/ai-chat.util';

const MAX_STORED = 100;
const MAX_CHATS = 40;

/**
 * Chat con la IA de MyAnimaLog (IA-service). Contrato real en docs/IA_CHAT_CONTRATO.md y en la colección
 * `MyAnimaLog-IA-service` de Postman. El historial de cada conversación lo guarda el servidor (por `conversationId`),
 * así que la app solo manda el mensaje nuevo.
 *
 * Mientras el gateway no publique `/api/ai/*` (hoy responde 404), el fallo sale como `AiError` y la pantalla lo muestra
 * como un mensaje del asistente, sin inventar respuestas. Para probar contra el servicio directo (Cloud Run o local),
 * se pone su dirección en `environment.ai.baseUrl`.
 *
 * Los chats también se guardan en el dispositivo (por usuario) como un historial que se puede buscar y borrar.
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  constructor(private http: HttpClient) {}

  /** Gateway (`/api/ai`) o, si se configura, el IA-service directo (`<baseUrl>/api/ai`). */
  private get base(): string {
    const direct = environment.ai?.baseUrl;
    return direct ? `${direct.replace(/\/+$/, '')}/api/ai` : `${environment.apiUrl}/ai`;
  }

  /**
   * Manda un mensaje (texto, archivos o ambos). Con `conversationId` continúa esa conversación; sin él empieza una.
   * `context` dice en qué pantalla está el usuario (mini chat del modo seguimiento).
   */
  send(text: string, files: File[], conversationId?: string, context?: AiContext): Observable<AiReply> {
    const body = new FormData();
    if (text) body.append('message', text);
    if (conversationId) body.append('conversationId', conversationId);
    if (context) body.append('context', JSON.stringify(context));
    files.forEach(f => body.append('files', f, f.name));

    return this.http.post<any>(`${this.base}/chat`, body).pipe(
      map(r => this.toReply(r)),
      catchError(err => throwError(() => parseAiError(err)))
    );
  }

  /** El usuario aprueba una acción propuesta (crear mascota, agendar cita...): recién ahí se escribe. */
  confirmAction(actionId: string): Observable<AiReply> {
    return this.http.post<any>(`${this.base}/actions/${actionId}/confirm`, {}).pipe(
      map(r => this.toReply(r)),
      catchError(err => throwError(() => parseAiError(err)))
    );
  }

  rejectAction(actionId: string): Observable<AiReply> {
    return this.http.post<any>(`${this.base}/actions/${actionId}/reject`, {}).pipe(
      map(r => this.toReply(r)),
      catchError(err => throwError(() => parseAiError(err)))
    );
  }

  private toReply(r: any): AiReply {
    const reply = r?.reply ?? r?.message ?? r?.answer ?? r?.text ?? r?.response ?? '';
    return {
      reply: String(reply),
      conversationId: r?.conversationId ?? r?.conversation_id,
      model: r?.model,
      pendingAction: this.toPendingAction(r?.pendingAction ?? r?.pending_action),
    };
  }

  private toPendingAction(raw: any): AiPendingAction | null {
    if (!raw || !raw.id) return null;
    return {
      id: String(raw.id),
      description: String(raw.descripcion ?? raw.description ?? raw['descripción'] ?? 'Acción pendiente'),
      status: 'PENDING',
    };
  }

  // ---------- Historial del servidor (IA-service: GET /ai/conversations) ----------

  /** Conversaciones de este usuario guardadas en el servidor (no traen mensajes: solo id, título y fecha). */
  fetchConversations(limit = 50): Observable<AiChat[]> {
    return this.http.get<any>(`${this.base}/conversations`, { params: { limit: String(limit), offset: '0' } }).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : res?.conversations ?? res?.data ?? [];
        return list
          .filter(c => c?.id)
          .map((c): AiChat => {
            const updatedAt = c.updatedAt ?? c.updated_at ?? new Date().toISOString();
            return {
              id: 'srv-' + c.id, title: c.titulo ?? c.title ?? 'Chat', createdAt: updatedAt, updatedAt,
              conversationId: c.id, messages: [], remote: true,
            };
          });
      }),
      catchError(err => throwError(() => parseAiError(err)))
    );
  }

  /** Mensajes de una conversación del servidor (los de rol "tool" son internos y no se muestran). */
  fetchMessages(conversationId: string): Observable<AiMessage[]> {
    return this.http.get<any>(`${this.base}/conversations/${conversationId}/messages`, { params: { limit: '200', offset: '0' } }).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : res?.messages ?? res?.data ?? [];
        return list
          .filter(m => (m?.rol ?? m?.role) !== 'tool' && (m?.contenido ?? m?.content ?? m?.text))
          .map((m): AiMessage => ({
            id: m.id ?? newMessageId(),
            role: (m.rol ?? m.role) === 'user' ? 'user' : 'assistant',
            text: String(m.contenido ?? m.content ?? m.text),
            createdAt: m.createdAt ?? m.created_at ?? new Date().toISOString(),
          }));
      }),
      catchError(err => throwError(() => parseAiError(err)))
    );
  }

  // ---------- Historial de chats (por usuario, en el dispositivo) ----------

  private get userId(): string {
    return localStorage.getItem('userId') || '';
  }
  private get chatsKey(): string { return `aiChats_${this.userId}`; }
  private get activeKey(): string { return `aiActive_${this.userId}`; }
  private get legacyKey(): string { return `aiChat_${this.userId}`; }
  private get introKey(): string { return `aiIntroSeen_${this.userId}`; }

  /** Todos los chats, del más reciente al más antiguo. */
  listChats(): AiChat[] {
    let chats: AiChat[] = [];
    try {
      const raw = localStorage.getItem(this.chatsKey);
      if (raw) {
        const data = JSON.parse(raw);
        chats = Array.isArray(data) ? data : [];
      } else {
        chats = this.migrateLegacy();
      }
    } catch {
      chats = [];
    }
    return chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getChat(id: string): AiChat | null {
    return this.listChats().find(c => c.id === id) ?? null;
  }

  /** Crea o actualiza un chat. No guarda la presentación, los errores ni las miniaturas (blob:), que no sobreviven a la sesión. */
  saveChat(chat: AiChat): void {
    const clean: AiChat = {
      ...chat,
      messages: chat.messages
        .filter(m => !m.intro && !m.error)
        .slice(-MAX_STORED)
        .map(m => ({ ...m, attachments: m.attachments?.map(a => ({ name: a.name, size: a.size, type: a.type })) })),
    };
    const others = this.listChats().filter(c => c.id !== clean.id);
    const all = [clean, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_CHATS);
    this.writeChats(all);
  }

  deleteChat(id: string): void {
    this.writeChats(this.listChats().filter(c => c.id !== id));
    if (this.getActiveChatId() === id) this.setActiveChatId(null);
  }

  deleteAllChats(): void {
    this.writeChats([]);
    this.setActiveChatId(null);
  }

  getActiveChatId(): string | null {
    try { return localStorage.getItem(this.activeKey) || null; } catch { return null; }
  }

  setActiveChatId(id: string | null): void {
    try {
      if (id) localStorage.setItem(this.activeKey, id);
      else localStorage.removeItem(this.activeKey);
    } catch { /* se abre un chat nuevo la próxima vez */ }
  }

  private writeChats(chats: AiChat[]): void {
    try { localStorage.setItem(this.chatsKey, JSON.stringify(chats)); } catch { /* el historial solo vive en pantalla */ }
  }

  /** Antes había una sola conversación (`aiChat_<usuario>`): pasa a ser el primer chat del historial. */
  private migrateLegacy(): AiChat[] {
    try {
      const raw = localStorage.getItem(this.legacyKey);
      if (!raw) return [];
      const data = JSON.parse(raw);
      const messages: AiMessage[] = Array.isArray(data?.messages) ? data.messages : [];
      localStorage.removeItem(this.legacyKey);
      if (!messages.length) return [];
      const last = messages[messages.length - 1]?.createdAt || new Date().toISOString();
      const chat: AiChat = {
        id: newMessageId(), title: chatTitle(messages), createdAt: messages[0].createdAt || last, updatedAt: last,
        conversationId: data?.conversationId || undefined, messages,
      };
      this.writeChats([chat]);
      return [chat];
    } catch {
      return [];
    }
  }

  hasSeenIntro(): boolean {
    try { return localStorage.getItem(this.introKey) === 'true'; } catch { return false; }
  }

  markIntroSeen(): void {
    try { localStorage.setItem(this.introKey, 'true'); } catch { /* se repetirá la presentación */ }
  }
}
