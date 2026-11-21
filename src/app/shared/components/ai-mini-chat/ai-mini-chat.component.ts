import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AI_NAME, AiContext, AiMessage } from 'src/app/models/ai-chat.model';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { AiConversationService } from 'src/app/services/AiConversationService/ai-conversation';
import { ScreenInfo, describeScreen, formatAiText, suggestionsFor } from 'src/app/shared/utils/ai-chat.util';

/**
 * Mini chat del modo seguimiento: un panel lateral que se despliega sobre cualquier pantalla. La IA sabe en cuál está el
 * usuario (se manda como `context`), así que puede pedirle cosas ahí mismo. Es la misma conversación del chat completo
 * (`AiConversationService`): lo que se escribe aquí sigue en `/ia`, y al revés. Para adjuntar documentos hay que abrir
 * el chat completo.
 */
@Component({
  selector: 'app-ai-mini-chat',
  templateUrl: './ai-mini-chat.component.html',
  styleUrls: ['./ai-mini-chat.component.scss'],
  standalone: false
})
export class AiMiniChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('body') bodyRef?: ElementRef<HTMLElement>;

  readonly aiName = AI_NAME;
  open = false;
  screen: ScreenInfo = { key: 'home', label: 'Inicio' };
  draft = '';

  private subs = new Subscription();
  private needsScroll = false;
  private readonly touchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  constructor(
    private router: Router,
    private nav: NavController,
    private access: AiAccessService,
    public conv: AiConversationService
  ) {}

  ngOnInit(): void {
    this.screen = describeScreen(this.router.url);
    this.subs.add(
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(e => {
        this.screen = describeScreen(e.urlAfterRedirects);
        this.access.closeMini(); // al cambiar de pantalla el panel se cierra
      })
    );
    this.subs.add(
      this.access.miniOpen$.subscribe(open => {
        this.open = open;
        if (open) {
          this.screen = describeScreen(this.router.url);
          this.conv.loadActive(); // continúa el chat que estaba abierto
          this.needsScroll = true;
        }
      })
    );
    this.subs.add(this.conv.updated$.subscribe(() => (this.needsScroll = true)));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /** Baja el scroll cuando llegan mensajes nuevos. */
  ngAfterViewChecked(): void {
    if (!this.needsScroll || !this.bodyRef) return;
    this.needsScroll = false;
    const el = this.bodyRef.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  get context(): AiContext {
    return { screen: this.screen.key, label: this.screen.label, petId: this.screen.petId };
  }

  get suggestions(): string[] { return suggestionsFor(this.screen.key); }
  get canSend(): boolean { return !this.conv.sending && this.draft.trim().length > 0; }

  close(): void { this.access.closeMini(); }

  /** Pasa al chat completo con la misma conversación. */
  expand(): void {
    this.access.closeMini();
    this.nav.navigateForward(['/ia']);
  }

  send(): void {
    if (!this.canSend) return;
    const text = this.draft.trim();
    this.draft = '';
    this.conv.send(text, [], this.context);
  }

  useSuggestion(text: string): void {
    if (this.conv.sending) return;
    this.conv.send(text, [], this.context);
  }

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (this.touchDevice || e.shiftKey) return;
    e.preventDefault();
    this.send();
  }

  html(text: string): string { return formatAiText(text); }
  confirmAction(m: AiMessage): void { this.conv.confirm(m); }
  rejectAction(m: AiMessage): void { this.conv.reject(m); }
  retry(): void { this.conv.retry(); }
  trackById(_: number, m: { id: string }): string { return m.id; }
}
