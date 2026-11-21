import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AiAttachment, AiChat, AiContext, AiError, AiMessage, AiReply } from 'src/app/models/ai-chat.model';
import { AiChatService } from 'src/app/services/AiChatService/ai-chat';
import { aiErrorText, chatTitle, newMessageId } from 'src/app/shared/utils/ai-chat.util';

/**
 * Estado de la conversación con la IA, compartido por el chat completo (`/ia`) y el mini chat del modo seguimiento:
 * los dos ven y continúan el mismo chat. Envía mensajes, reintenta, confirma o rechaza las acciones que propone la IA
 * y mantiene el historial guardado.
 */
@Injectable({ providedIn: 'root' })
export class AiConversationService {
  chat: AiChat | null = null;
  messages: AiMessage[] = [];
  conversationId?: string;
  /** Todos los chats guardados (se refresca al guardar, abrir o borrar). */
  chatList: AiChat[] = [];
  sending = false;
  /** El asistente "está escribiendo". */
  typing = false;
  /** Id de la acción que se está confirmando o rechazando (para deshabilitar sus botones). */
  actionBusyId: string | null = null;

  /** Avisa cuando algo cambió y las pantallas deben bajar el scroll. */
  readonly updated$ = new Subject<void>();

  private last: { text: string; files: File[]; context?: AiContext } | null = null;

  /** Usuario al que pertenece lo que hay en memoria. Este servicio es único para toda la app: si entra otra cuenta, se limpia. */
  private ownerId: string | null = null;

  constructor(private api: AiChatService) {}

  private currentUser(): string {
    return localStorage.getItem('userId') || '';
  }

  /**
   * Cada cuenta tiene su historial (guardado por `userId`). Si cambió el usuario desde la última vez, se descarta el chat
   * que quedó en memoria para que no se vea ni se guarde en la cuenta nueva.
   */
  private syncUser(): void {
    const uid = this.currentUser();
    if (uid === this.ownerId) return;
    const first = this.ownerId === null; // la primera vez no hay nada de nadie en memoria
    this.ownerId = uid;
    if (first) return;
    this.chat = null;
    this.messages = [];
    this.conversationId = undefined;
    this.chatList = [];
    this.remoteChats = [];
    this.remoteLoading = false;
    this.sending = false;
    this.typing = false;
    this.actionBusyId = null;
    this.last = null;
    this.updated$.next();
  }

  /** Una respuesta que llega cuando ya entró otra cuenta no se muestra ni se guarda. */
  private isStale(owner: string | null): boolean {
    return owner !== this.currentUser() || owner !== this.ownerId;
  }

  // ---------------------------------------------------------------- Cargar

  /** Se están trayendo del servidor los chats o los mensajes de uno. */
  remoteLoading = false;

  /** Los chats del servidor que todavía no están en este dispositivo (se identifican por `conversationId`). */
  private remoteChats: AiChat[] = [];

  /** Locales + los que solo están en el servidor, del más reciente al más antiguo. */
  private mergedList(): AiChat[] {
    const local = this.api.listChats();
    const known = new Set(local.map(c => c.conversationId).filter(Boolean));
    return [...local, ...this.remoteChats.filter(r => !known.has(r.conversationId))].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Vuelve a armar la lista (locales + servidor). */
  refreshList(): void {
    this.chatList = this.mergedList();
  }

  /** Trae del servidor el historial de esta cuenta (así se ven los chats de otro dispositivo o de otro navegador). */
  loadRemote(): void {
    const owner = this.ownerId;
    this.api.fetchConversations().subscribe({
      next: list => {
        if (this.isStale(owner)) return;
        this.remoteChats = list;
        this.chatList = this.mergedList();
        this.updated$.next();
      },
      error: e => console.error('❌ No se pudo traer el historial del servidor', e), // se sigue con el del dispositivo
    });
  }

  /** Carga el chat que estaba abierto (o un chat nuevo si no había). */
  loadActive(): void {
    this.syncUser();
    this.chatList = this.mergedList();
    this.loadRemote();
    const id = this.api.getActiveChatId();
    this.setChat(id ? this.chatList.find(c => c.id === id) ?? null : null);
  }

  private setChat(c: AiChat | null): void {
    this.chat = c;
    this.messages = c?.messages ?? [];
    this.conversationId = c?.conversationId;
    this.sending = false;
    this.typing = false;
    this.actionBusyId = null;
    this.last = null;
    this.api.setActiveChatId(c?.id ?? null);
    this.updated$.next();
  }

  // ---------------------------------------------------------------- Enviar

  send(text: string, files: File[] = [], context?: AiContext, attachments?: AiAttachment[]): void {
    this.syncUser();
    if (this.sending || (!text.trim() && !files.length)) return;
    this.messages = [...this.messages, {
      id: newMessageId(), role: 'user', text: text.trim(), attachments: attachments?.length ? attachments : undefined,
      createdAt: new Date().toISOString(),
    }];
    this.last = { text: text.trim(), files, context };
    this.persist(); // el chat entra al historial desde el primer mensaje
    this.request(false);
  }

  /** Vuelve a pedir la respuesta al último mensaje (después de un error). */
  retry(): void {
    if (this.sending || !this.last) return;
    this.messages = this.messages.filter(m => !m.error);
    this.request(false);
  }

  private request(alreadyRecovered: boolean): void {
    if (!this.last) return;
    const { text, files, context } = this.last;
    this.sending = true;
    this.typing = true;
    this.updated$.next();
    const owner = this.ownerId;
    this.api.send(text, files, this.conversationId, context).subscribe({
      next: reply => {
        if (this.isStale(owner)) return;
        this.sending = false;
        this.typing = false;
        this.pushReply(reply);
        this.persist();
      },
      error: (e: AiError) => {
        if (this.isStale(owner)) return;
        // La conversación guardada ya no existe en el servidor: se sigue en una nueva, una sola vez, sin molestar al usuario.
        if (e.code === 'CONVERSATION_NOT_FOUND' && this.conversationId && !alreadyRecovered) {
          this.conversationId = undefined;
          this.request(true);
          return;
        }
        console.error('❌ Chat con la IA', e);
        this.sending = false;
        this.typing = false;
        this.pushAssistant(aiErrorText(e), { error: true });
        this.persist();
      },
    });
  }

  private pushReply(reply: AiReply): void {
    if (reply.conversationId) this.conversationId = reply.conversationId;
    const text = reply.reply.trim() || (reply.pendingAction ? 'Revisa y confirma esta acción:' : 'No pude armar una respuesta. ¿Me lo cuentas de otra forma?');
    this.pushAssistant(text, { pendingAction: reply.pendingAction ?? undefined });
  }

  private pushAssistant(text: string, extra: Partial<AiMessage> = {}): void {
    this.messages = [...this.messages, { id: newMessageId(), role: 'assistant', text, createdAt: new Date().toISOString(), ...extra }];
    this.updated$.next();
  }

  // ---------------------------------------------------------------- Acciones propuestas por la IA

  confirm(message: AiMessage): void { this.resolve(message, true); }
  reject(message: AiMessage): void { this.resolve(message, false); }

  private resolve(message: AiMessage, accept: boolean): void {
    const action = message.pendingAction;
    if (!action || action.status !== 'PENDING' || this.actionBusyId) return;
    this.actionBusyId = action.id;
    this.updated$.next();
    const call$ = accept ? this.api.confirmAction(action.id) : this.api.rejectAction(action.id);
    call$.subscribe({
      next: reply => {
        this.actionBusyId = null;
        this.setActionStatus(message.id, accept ? 'CONFIRMED' : 'REJECTED');
        this.pushAssistant(reply.reply.trim() || (accept ? 'Listo.' : 'Listo, no hice ningún cambio.'));
        this.persist();
      },
      error: (e: AiError) => {
        console.error('❌ Acción de la IA', e);
        this.actionBusyId = null;
        if (e.code === 'ACTION_NOT_FOUND') this.setActionStatus(message.id, 'EXPIRED');
        this.pushAssistant(aiErrorText(e), { error: true });
        this.persist();
      },
    });
  }

  private setActionStatus(messageId: string, status: 'CONFIRMED' | 'REJECTED' | 'EXPIRED'): void {
    this.messages = this.messages.map(m =>
      m.id === messageId && m.pendingAction ? { ...m, pendingAction: { ...m.pendingAction, status } } : m
    );
  }

  // ---------------------------------------------------------------- Historial

  /** Guarda el chat actual en el historial (los errores y la presentación no se guardan). */
  private persist(): void {
    const real = this.messages.filter(m => !m.intro && !m.error);
    if (!real.length) return;
    const now = new Date().toISOString();
    this.chat = {
      id: this.chat?.id ?? newMessageId(),
      createdAt: this.chat?.createdAt ?? now,
      title: chatTitle(real),
      updatedAt: now,
      conversationId: this.conversationId,
      messages: this.messages,
    };
    this.api.saveChat(this.chat);
    this.api.setActiveChatId(this.chat.id);
    this.chatList = this.mergedList();
  }

  /** Chat nuevo: el actual ya quedó guardado en el historial. */
  newChat(): void {
    this.syncUser();
    this.setChat(null);
  }

  openChat(c: AiChat): void {
    this.syncUser();
    if (this.sending) return;
    // Un chat que solo está en el servidor: se abre vacío y se le traen los mensajes.
    if (c.remote && !c.messages.length && c.conversationId) {
      const owner = this.ownerId;
      this.setChat({ ...c, remote: false });
      this.remoteLoading = true;
      this.api.fetchMessages(c.conversationId).subscribe({
        next: msgs => {
          if (this.isStale(owner) || this.chat?.id !== c.id) return;
          this.remoteLoading = false;
          this.messages = msgs;
          this.chat = { ...c, remote: false, messages: msgs };
          this.updated$.next();
        },
        error: e => {
          if (this.isStale(owner)) return;
          console.error('❌ No se pudieron traer los mensajes del servidor', e);
          this.remoteLoading = false;
          this.pushAssistant('No pude traer esta conversación. Intenta de nuevo en un momento.', { error: true });
        },
      });
      return;
    }
    this.setChat(c);
  }

  deleteChat(id: string): void {
    this.syncUser();
    this.api.deleteChat(id);
    this.remoteChats = this.remoteChats.filter(r => r.id !== id); // el servidor no tiene borrado: solo se oculta en esta sesión
    this.chatList = this.mergedList();
    if (this.chat?.id === id) this.setChat(null);
  }

  deleteAll(): void {
    this.api.deleteAllChats();
    this.remoteChats = [];
    this.chatList = [];
    this.setChat(null);
  }
}
