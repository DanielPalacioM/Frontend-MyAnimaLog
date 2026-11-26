import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { GreetingView } from 'src/app/shared/utils/home-today.util';
import { SAY_MS, mascotReaction } from 'src/app/shared/utils/mascot-talk.util';
import { MascotComponent } from '../mascot/mascot.component';

/**
 * Saludo del Home (Figma "Home/Saludo"): cambia con la hora y con lo que pasa con las mascotas.
 * El perrito es el anfitrión (y la cara de la IA): va por capas (app-mascot) y saluda con el cuerpo.
 * Entra con un salto y levanta la pata (una vez por sesión); después hace la pose que pide el saludo (view.pose)
 * y en reposo respira, mira a los lados y mueve la cola.
 * Cada toque hace un movimiento distinto con su globo de diálogo (ver mascot-talk.util). El último invita a hablar:
 * el toque siguiente abre el mini chat de la IA.
 */
@Component({
  selector: 'app-home-greeting',
  template: `
    <section class="greet" [ngClass]="'mood-' + view.mood" *ngIf="view" aria-live="polite">
      <span class="star s1" *ngIf="view.mood === 'night'"></span><span class="star s2" *ngIf="view.mood === 'night'"></span><span class="star s3" *ngIf="view.mood === 'night'"></span>
      <span class="confetti c1" *ngIf="view.mood === 'birthday'"></span><span class="confetti c2" *ngIf="view.mood === 'birthday'"></span><span class="confetti c3" *ngIf="view.mood === 'birthday'"></span>

      <div class="texts">
        <p class="date">{{ view.date }}</p>
        <h2 class="title">{{ view.title }}</h2>
        <p class="line">{{ view.line }}</p>
        <button type="button" class="cta" *ngIf="view.cta" (click)="action.emit(view.cta)">{{ view.cta.label }}</button>
        <span class="chip" *ngIf="view.chip && !view.cta">{{ view.chip }}</span>
      </div>

      <button type="button" class="stage" [class.intro]="animate" (click)="onDogTap()"
              [attr.aria-label]="chatNext ? 'Hablar con el asistente de MyAnimaLog' : 'Tocar al perrito'">
        <span class="bubble" *ngFor="let k of [sayKey]" [class.said]="!!say" [class.chat]="chatNext" aria-live="polite">{{ say || view.bubble }}</span>
        <span class="floor"></span>
        <app-mascot class="dog" [pose]="view.pose" [intro]="animate"></app-mascot>
      </button>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .greet {
      position: relative; overflow: hidden; display: flex; align-items: flex-end; min-height: 184px; border-radius: 22px;
      padding: 18px 0 0 18px; font-family: 'Actor', sans-serif; color: #1a1a2e;
      background: linear-gradient(135deg, #FFC970, #F5A623);
    }
    .mood-morning { background: linear-gradient(135deg, #FFF1DA, #FFB84F); }
    .mood-afternoon { background: linear-gradient(135deg, #FFC970, #F5A623); }
    .mood-night { background: linear-gradient(135deg, #2B2470, #4037BE); color: #fff; }
    .mood-welcome { background: linear-gradient(135deg, #E9E7FB, #F7F6FF); }
    .mood-birthday { background: linear-gradient(135deg, #FFE0EC, #FFB84F); }

    .texts { position: relative; z-index: 1; flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding-bottom: 18px; }
    .date { margin: 0; font-size: 12px; color: #3D254D; }
    .title { margin: 0; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 23px; line-height: 1.15; }
    .line { margin: 0; font-size: 13.5px; line-height: 1.35; color: #3D254D; }
    .mood-night .date, .mood-night .line { color: #E4E2F4; }
    .mood-welcome .line { color: #4A4860; }
    .cta { margin-top: 4px; border: none; border-radius: 999px; padding: 8px 14px; background: #4037BE; color: #fff; font-family: 'Actor', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
    .cta:active { transform: scale(.97); }
    .chip { margin-top: 4px; border-radius: 999px; padding: 5px 11px; background: rgba(255, 255, 255, .78); font-size: 12px; }
    .mood-night .chip { background: rgba(255, 255, 255, .18); color: #fff; }

    /* Escenario: el perrito entero sobre su sombra, con aire para moverse */
    .stage { position: relative; flex-shrink: 0; width: 154px; height: 184px; border: none; background: transparent; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .floor { position: absolute; left: 24px; bottom: 10px; width: 108px; height: 14px; border-radius: 50%; background: rgba(0, 0, 0, .12); }
    .dog { position: absolute; left: 10px; bottom: 12px; width: 134px; height: 138px; transform-origin: 50% 100%; transition: transform .12s ease-out; pointer-events: none; user-select: none; }
    /* Globo de diálogo: arriba del perrito, con su colita apuntándole */
    .bubble {
      position: absolute; right: 8px; top: 6px; z-index: 2; max-width: 146px; padding: 5px 11px; border-radius: 14px; background: #fff; color: #4037BE;
      font-family: 'Jua', sans-serif; font-size: 13px; line-height: 1.2; text-align: center; box-shadow: 0 2px 8px rgba(0, 0, 0, .12);
      transform-origin: 70% 100%;
    }
    .bubble::after { content: ''; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 10px; background: #fff; transform: rotate(45deg); border-radius: 2px; }
    .bubble.chat { background: #4037BE; color: #fff; }
    .bubble.chat::after { background: #4037BE; }
    .intro .floor { animation: floorIn .45s ease-out both; }
    .intro .bubble { animation: pop .3s ease-out .55s both; }
    @keyframes floorIn { from { transform: scaleX(.3); opacity: 0; } to { transform: none; opacity: 1; } }
    .stage .bubble.said { animation: pop .3s cubic-bezier(.3, 1.5, .5, 1) both; }
    @keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
    .stage:active .dog { transform: scale(.95); }

    .star { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, .85); }
    .s1 { width: 4px; height: 4px; right: 150px; top: 26px; } .s2 { width: 3px; height: 3px; right: 18px; top: 72px; } .s3 { width: 5px; height: 5px; right: 70px; top: 120px; }
    .confetti { position: absolute; width: 7px; height: 7px; border-radius: 2px; transform: rotate(30deg); }
    .c1 { right: 120px; top: 24px; background: #4037BE; } .c2 { right: 96px; top: 12px; background: #00796B; } .c3 { right: 14px; top: 64px; background: #B42318; }

    @media (prefers-reduced-motion: reduce) { .intro .floor, .intro .bubble, .stage .bubble.said { animation: none !important; } .dog { transition: none; } }
  `],
  standalone: false
})
export class HomeGreetingComponent implements OnDestroy {
  @Input() view: GreetingView | null = null;
  /** Entrada con salto y saludo: solo la primera vez que se abre el Home en la sesión. */
  @Input() animate = false;
  @Output() action = new EventEmitter<NonNullable<GreetingView['cta']>>();
  /** Hablar con el perrito: es el mismo personaje de la IA (abre el mini chat). */
  @Output() dogTap = new EventEmitter<void>();

  @ViewChild(MascotComponent) dog?: MascotComponent;
  /** Lo que dice ahora por un toque (si no, el globo del saludo). */
  say: string | null = null;
  /** Cambia en cada toque para volver a crear el globo y que «salte» otra vez. */
  sayKey = 0;
  /** El perrito acaba de ofrecer hablar: el próximo toque abre el chat. */
  chatNext = false;
  private step = 0;
  private sayTimer?: ReturnType<typeof setTimeout>;

  onDogTap(): void {
    clearTimeout(this.sayTimer);
    if (this.chatNext) {
      this.chatNext = false;
      this.step = 0;
      this.say = null;
      this.sayKey++;
      this.dog?.play('jump');
      this.dogTap.emit();
      return;
    }
    const r = mascotReaction(this.step++, this.view?.mood === 'night');
    this.say = r.say;
    this.sayKey++;
    this.chatNext = !!r.chat;
    this.dog?.play(r.act);
    this.sayTimer = setTimeout(() => {
      this.say = null;
      this.chatNext = false;
      this.sayKey++;
    }, SAY_MS + (r.chat ? 3000 : 0));
  }

  ngOnDestroy(): void {
    clearTimeout(this.sayTimer);
  }
}
