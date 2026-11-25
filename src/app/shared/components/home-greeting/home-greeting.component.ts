import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GreetingView } from 'src/app/shared/utils/home-today.util';

/**
 * Saludo del Home (Figma "Home/Saludo"): cambia con la hora y con lo que pasa con las mascotas.
 * El perrito es el anfitrión (y la cara de la IA): está entero sobre un piso para poder animarlo.
 * Hoy es un PNG plano, así que se anima entero: entra con un salto y saluda (una vez por sesión) y después solo se balancea
 * cada ~9 s. Cuando exista el perrito por capas (cabeza, patas, cola) se cambia por la animación por partes.
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

      <button type="button" class="stage" [class.intro]="animate" (click)="dogTap.emit()" aria-label="Hablar con el asistente de MyAnimaLog">
        <span class="bubble">{{ view.bubble }}</span>
        <span class="floor"></span>
        <img class="dog" src="assets/images/logo app.png" alt="" draggable="false" />
      </button>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .greet {
      position: relative; overflow: hidden; display: flex; align-items: flex-end; min-height: 168px; border-radius: 22px;
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
    .stage { position: relative; flex-shrink: 0; width: 132px; height: 150px; border: none; background: transparent; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .floor { position: absolute; left: 22px; bottom: 10px; width: 88px; height: 12px; border-radius: 50%; background: rgba(0, 0, 0, .12); }
    .dog { position: absolute; left: 14px; bottom: 14px; width: 104px; height: 110px; object-fit: contain; transform-origin: 50% 100%; animation: sway 9s ease-in-out 3s infinite; pointer-events: none; user-select: none; }
    .bubble { position: absolute; right: 10px; top: 6px; z-index: 2; padding: 4px 10px; border-radius: 12px; background: #fff; color: #4037BE; font-family: 'Jua', sans-serif; font-size: 13px; box-shadow: 0 2px 6px rgba(0, 0, 0, .1); white-space: nowrap; }
    .intro .dog { animation: hop .45s cubic-bezier(.3, 1.5, .5, 1) both, wave .9s ease-in-out .45s 2, sway 9s ease-in-out 3s infinite; }
    .intro .floor { animation: floorIn .45s ease-out both; }
    .intro .bubble { animation: pop .3s ease-out .55s both; }
    @keyframes hop { from { transform: translateY(60px) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes wave { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-7deg); } 75% { transform: rotate(5deg); } }
    @keyframes sway { 0%, 90%, 100% { transform: rotate(0); } 93% { transform: rotate(-4deg); } 96% { transform: rotate(4deg); } }
    @keyframes floorIn { from { transform: scaleX(.3); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
    .stage:active .dog { transform: scale(.95); }

    .star { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, .85); }
    .s1 { width: 4px; height: 4px; right: 128px; top: 26px; } .s2 { width: 3px; height: 3px; right: 18px; top: 72px; } .s3 { width: 5px; height: 5px; right: 70px; top: 120px; }
    .confetti { position: absolute; width: 7px; height: 7px; border-radius: 2px; transform: rotate(30deg); }
    .c1 { right: 120px; top: 24px; background: #4037BE; } .c2 { right: 96px; top: 12px; background: #00796B; } .c3 { right: 14px; top: 64px; background: #B42318; }

    @media (prefers-reduced-motion: reduce) { .dog, .intro .dog, .intro .floor, .intro .bubble { animation: none !important; } }
  `],
  standalone: false
})
export class HomeGreetingComponent {
  @Input() view: GreetingView | null = null;
  /** Entrada con salto y saludo: solo la primera vez que se abre el Home en la sesión. */
  @Input() animate = false;
  @Output() action = new EventEmitter<NonNullable<GreetingView['cta']>>();
  /** Tocar al perrito: es el mismo personaje de la IA. */
  @Output() dogTap = new EventEmitter<void>();
}
