import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertController, IonContent, NavController, ToastController } from '@ionic/angular';
import { AI_NAME, AiAttachment, AiChat, AiMessage } from 'src/app/models/ai-chat.model';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { AiChatService } from 'src/app/services/AiChatService/ai-chat';
import { AiConversationService } from 'src/app/services/AiConversationService/ai-conversation';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import {
  AI_ACCEPT, ChatGroup, chatWhen, formatAiText, formatFileSize, groupChats, newMessageId, searchChats, validateAttachment,
} from 'src/app/shared/utils/ai-chat.util';

interface Pending { file: File; previewUrl?: string; }
interface Suggestion { label: string; icon: string; prompt?: string; opensPicker?: boolean; }

/** Pausa entre los mensajes de la presentación de la primera vez. */
const INTRO_DELAY_MS = 900;

/**
 * Chat completo con la IA de MyAnimaLog (sin diseño en Figma; criterios del equipo): estilo ChatGPT/Claude, fondo naranja
 * de la app con la parte de abajo en blanco, logo y nombre al centro con el saludo. La primera vez se presenta en varios
 * mensajes; después solo da la bienvenida. Se escribe y se adjuntan documentos (PDF e imágenes).
 * Una barra lateral guarda los chats anteriores: se pueden abrir, buscar y borrar.
 * La conversación es la misma que usa el mini chat del modo seguimiento (`AiConversationService`).
 * Entra con una animación (un círculo que crece desde el botón).
 */
@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.page.html',
  styleUrls: ['./ai-chat.page.scss'],
  standalone: false
})
export class AiChatPage implements OnDestroy {
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('textarea') textarea?: ElementRef<HTMLTextAreaElement>;

  readonly aiName = AI_NAME;
  readonly accept = AI_ACCEPT;
  readonly suggestions: Suggestion[] = [
    { label: 'Explícame un documento', icon: 'document-text-outline', opensPicker: true },
    { label: '¿Cuáles son mis mascotas?', icon: 'paw-outline', prompt: '¿Cuáles son mis mascotas registradas?' },
    { label: 'Agéndame una cita', icon: 'calendar-outline', prompt: 'Quiero agendar una cita para una de mis mascotas.' },
  ];

  username = '';
  firstTime = false;
  /** Mensajes de la presentación de la primera vez (no se guardan en el chat). */
  intro: AiMessage[] = [];
  draft = '';
  pending: Pending[] = [];

  search = '';
  sidebarOpen = false;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private blobUrls: string[] = [];
  private updatedSub?: Subscription;
  private readonly touchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  /** El asistente "está escribiendo" entre los mensajes de la presentación. */
  private introTyping = false;

  constructor(
    private conv: AiConversationService,
    private ai: AiChatService,
    private profile: ProfileService,
    private toast: ToastController,
    private alert: AlertController,
    private host: ElementRef<HTMLElement>,
    private access: AiAccessService,
    private nav: NavController
  ) {}

  // ---------------------------------------------------------------- Estado de la conversación (vive en el servicio)

  get chat(): AiChat | null { return this.conv.chat; }
  get chats(): AiChat[] { return this.conv.chatList; }
  get messages(): AiMessage[] { return this.conv.messages; }
  get shown(): AiMessage[] { return this.intro.length ? [...this.intro, ...this.conv.messages] : this.conv.messages; }
  get sending(): boolean { return this.conv.sending; }
  get typing(): boolean { return this.conv.typing || this.introTyping; }
  get actionBusyId(): string | null { return this.conv.actionBusyId; }

  // ---------------------------------------------------------------- Ciclo de vida

  ionViewWillEnter(): void {
    this.playReveal();

    this.profile.getProfile().subscribe({
      next: p => (this.username = this.firstName(p?.username)),
      error: err => console.error('❌ No se pudo leer el nombre para el saludo', err),
    });

    this.access.closeMini(); // el mini chat y el chat completo no van a la vez
    this.intro = [];
    this.conv.loadActive();
    this.updatedSub?.unsubscribe();
    this.updatedSub = this.conv.updated$.subscribe(() => this.scrollToBottom());

    this.firstTime = !this.ai.hasSeenIntro();
    if (this.firstTime && !this.conv.messages.length) this.playIntro();
    else if (this.firstTime) this.ai.markIntroSeen();
    this.scrollToBottom();
  }

  ionViewWillLeave(): void {
    this.clearTimers();
    this.introTyping = false;
    this.sidebarOpen = false;
    this.updatedSub?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.updatedSub?.unsubscribe();
    this.blobUrls.forEach(u => URL.revokeObjectURL(u));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** Entrada: un círculo que crece desde el botón hasta cubrir la pantalla. Solo si se llegó desde el botón. */
  private playReveal(): void {
    const origin = this.access.takeLaunchOrigin();
    const el = this.host?.nativeElement;
    if (!origin || !el || typeof el.animate !== 'function') return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const w = window.innerWidth, h = window.innerHeight;
    const r = Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y)) + 8;
    el.animate(
      [
        { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, opacity: 0.7 },
        { clipPath: `circle(${r}px at ${origin.x}px ${origin.y}px)`, opacity: 1 },
      ],
      { duration: 520, easing: 'cubic-bezier(.22,.8,.3,1)' }
    );
  }

  // ---------------------------------------------------------------- Presentación y saludo

  private firstName(full: string | undefined): string {
    return (full ?? '').trim().split(/\s+/)[0] ?? '';
  }

  get greeting(): string {
    const name = this.username ? `, ${this.username}` : '';
    return this.firstTime ? `¡Hola${name}!` : `¡Qué bueno verte de nuevo${name}!`;
  }

  /** Textos con los que la IA se presenta la primera vez. */
  introTexts(): string[] {
    return [
      `Soy **${AI_NAME}**, la asistente de MyAnimaLog. Estoy aquí para ayudarte a cuidar a tus mascotas. 🐾`,
      'Puedo explicarte el historial médico, las vacunas y los resultados de tus mascotas, y resolver dudas de cuidado, alimentación y comportamiento.',
      'También puedes **adjuntar un documento** (un PDF o una foto de un examen, una receta o un carnet) y te lo explico en palabras sencillas.',
      'Importante: soy un apoyo, no reemplazo a tu veterinario. Si tu mascota tiene una urgencia, llévala a una clínica de inmediato.',
      '¿En qué te puedo ayudar hoy?',
    ];
  }

  private playIntro(): void {
    // Se marca como vista al empezar: si sale a mitad, la próxima vez ya recibe solo la bienvenida.
    this.ai.markIntroSeen();
    const texts = this.introTexts();
    texts.forEach((text, i) => {
      this.introTyping = true;
      const t = setTimeout(() => {
        this.intro = [...this.intro, { id: newMessageId(), role: 'assistant', text, createdAt: new Date().toISOString(), intro: true }];
        this.introTyping = i < texts.length - 1;
        this.scrollToBottom();
      }, INTRO_DELAY_MS * (i + 1));
      this.timers.push(t);
    });
  }

  get showSuggestions(): boolean {
    const introDone = !this.firstTime || this.intro.some(m => m.text.startsWith('¿En qué'));
    return introDone && !this.conv.sending && this.conv.messages.length === 0;
  }

  // ---------------------------------------------------------------- Texto y adjuntos

  get canSend(): boolean {
    return !this.conv.sending && (this.draft.trim().length > 0 || this.pending.length > 0);
  }

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    // En el teléfono Enter es salto de línea; en computador Enter envía y Shift+Enter salta.
    if (this.touchDevice || e.shiftKey) return;
    e.preventDefault();
    this.send();
  }

  autoSize(): void {
    const el = this.textarea?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  openPicker(): void {
    this.fileInput?.nativeElement.click();
  }

  async onFilesSelected(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // permite volver a elegir el mismo archivo
    const rejected: string[] = [];
    for (const file of files) {
      const why = validateAttachment(file, this.pending.length);
      if (why) { rejected.push(why); continue; }
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      if (previewUrl) this.blobUrls.push(previewUrl);
      this.pending = [...this.pending, { file, previewUrl }];
    }
    if (rejected.length) await this.showToast(rejected[0]);
  }

  removePending(i: number): void {
    this.pending = this.pending.filter((_, idx) => idx !== i);
  }

  size(bytes: number): string { return formatFileSize(bytes); }
  isImage(a: { type: string }): boolean { return a.type.startsWith('image/'); }
  html(text: string): string { return formatAiText(text); }

  useSuggestion(s: Suggestion): void {
    if (s.opensPicker) { this.openPicker(); return; }
    this.draft = s.prompt ?? s.label;
    this.send();
  }

  // ---------------------------------------------------------------- Enviar

  send(): void {
    if (!this.canSend) return;
    const text = this.draft.trim();
    const files = this.pending.map(p => p.file);
    const attachments: AiAttachment[] = this.pending.map(p => ({
      name: p.file.name, size: p.file.size, type: p.file.type, previewUrl: p.previewUrl,
    }));
    this.draft = '';
    this.pending = [];
    // El DOM todavía tiene el texto viejo hasta el siguiente ciclo: se recalcula la altura después.
    setTimeout(() => this.autoSize());
    this.conv.send(text, files, undefined, attachments);
  }

  retry(): void { this.conv.retry(); }
  confirmAction(m: AiMessage): void { this.conv.confirm(m); }
  rejectAction(m: AiMessage): void { this.conv.reject(m); }

  // ---------------------------------------------------------------- Historial (barra lateral)

  get groups(): ChatGroup<AiChat>[] {
    return groupChats(searchChats(this.chats, this.search));
  }

  when(c: AiChat): string { return chatWhen(c.updatedAt); }
  count(c: AiChat): number { return c.messages.filter(m => !m.intro).length; }

  openSidebar(): void {
    this.conv.refreshList();
    this.conv.loadRemote(); // trae también los chats que están solo en el servidor
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    this.search = '';
  }

  newChat(): void {
    this.clearTimers();
    this.intro = [];
    this.introTyping = false;
    this.pending = [];
    this.draft = '';
    this.conv.newChat();
    this.closeSidebar();
  }

  openChat(c: AiChat): void {
    if (this.conv.sending) return;
    this.intro = [];
    this.pending = [];
    this.draft = '';
    this.conv.openChat(c);
    this.closeSidebar();
  }

  async askDelete(c: AiChat, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.confirm('¿Borrar este chat?', `"${c.title}" se borra de este dispositivo.`, 'Borrar');
    if (ok) this.conv.deleteChat(c.id);
  }

  async askDeleteAll(): Promise<void> {
    const ok = await this.confirm('¿Borrar todos los chats?', 'Se borra todo tu historial de este dispositivo.', 'Borrar todos');
    if (!ok) return;
    this.conv.deleteAll();
    this.intro = [];
  }

  private async confirm(header: string, message: string, confirmText: string): Promise<boolean> {
    return new Promise<boolean>(async resolve => {
      const a = await this.alert.create({
        header, message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: confirmText, role: 'destructive', handler: () => resolve(true) },
        ],
      });
      a.onDidDismiss().then(() => resolve(false)); // cerrar tocando fuera cuenta como cancelar
      await a.present();
    });
  }

  // ---------------------------------------------------------------- Navegación

  goBack(): void {
    this.nav.navigateBack(['/home']);
  }

  trackById(_: number, m: { id: string }): string { return m.id; }

  private scrollToBottom(): void {
    setTimeout(() => this.content?.scrollToBottom(250), 60);
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 3000, position: 'top' });
    await t.present();
  }
}
