import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { LONG_PRESS_MS } from 'src/app/shared/utils/ai-fab.util';

/**
 * Botón de la IA en **modo anclado**: aparece junto al menú (≡) del Inicio cuando el usuario lo sacó del modo seguimiento
 * (arrastrándolo a "Ocultar"). Un toque abre el chat completo. Mantenido presionado ofrece "Volver al modo seguimiento",
 * que lo devuelve a flotar sobre todas las pantallas.
 */
@Component({
  selector: 'app-ai-dock',
  template: `
    <div class="dock" *ngIf="visible">
      <button type="button" class="dock-btn" [class.pressing]="pressing" data-tour="ai-dock" aria-label="Abrir el asistente de IA"
              (pointerdown)="onDown()" (pointerup)="onUp()" (pointercancel)="cancel()" (pointerleave)="cancel()"
              (keydown.enter)="open()" (contextmenu)="onContextMenu($event)">
        <app-mascot class="dock-dog" pose="hello"></app-mascot>
      </button>

      <div class="dock-backdrop" *ngIf="menuOpen" (click)="menuOpen = false"></div>
      <div class="dock-menu" *ngIf="menuOpen" role="menu">
        <button type="button" role="menuitem" (click)="followMode()">
          <ion-icon name="navigate-circle-outline"></ion-icon>
          <span>Volver al modo seguimiento<small>El botón vuelve a flotar en todas las pantallas</small></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .dock { position: relative; }
    .dock-btn {
      width: 34px; height: 34px; border-radius: 50%; border: 2px solid #fff; padding: 0; cursor: pointer; touch-action: none; user-select: none;
      background: radial-gradient(circle at 30% 25%, #ffc65c, #f5a623 60%, #e8940f);
      box-shadow: 0 4px 12px rgba(178, 106, 0, .35); display: flex; align-items: center; justify-content: center; transition: transform .15s;
    }
    .dock-dog { width: 25px; height: 25px; pointer-events: none; }
    .dock-btn.pressing { transform: scale(1.14); }
    /* Al aparecer "salta" y emite dos ondas, para que se note dónde quedó */
    .dock-btn { animation: dockPop .45s cubic-bezier(.22, .8, .3, 1), dockRing 1.2s ease-out .35s 2; }
    @keyframes dockPop { from { transform: scale(.2); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes dockRing { 0% { box-shadow: 0 0 0 0 rgba(245, 166, 35, .65), 0 4px 12px rgba(178, 106, 0, .35); } 100% { box-shadow: 0 0 0 14px rgba(245, 166, 35, 0), 0 4px 12px rgba(178, 106, 0, .35); } }
    @media (prefers-reduced-motion: reduce) { .dock-btn { animation: none; } }
    .dock-backdrop { position: fixed; inset: 0; z-index: 40; }
    .dock-menu {
      position: absolute; top: calc(100% + 8px); right: -4px; z-index: 41; width: 230px; padding: 6px; background: #fff; border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, .18), 0 2px 8px rgba(0, 0, 0, .08); animation: dockIn .16s ease-out; transform-origin: top right;
    }
    .dock-menu button {
      display: flex; align-items: flex-start; gap: 9px; width: 100%; padding: 9px 10px; border: none; border-radius: 10px; background: transparent;
      font-family: 'Actor', sans-serif; font-size: 13.5px; font-weight: 700; color: #1a1a2e; text-align: left; cursor: pointer;
    }
    .dock-menu button:active { background: #FFF4E0; }
    .dock-menu ion-icon { font-size: 20px; color: #B26A00; flex-shrink: 0; margin-top: 1px; }
    .dock-menu small { display: block; font-weight: 400; line-height: 1.3; font-size: 11.5px; color: #6b6b80; margin-top: 1px; }
    @keyframes dockIn { from { opacity: 0; transform: scale(.92) translateY(-4px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .dock-menu { animation: none; } }
  `],
  standalone: false
})
export class AiDockComponent implements OnInit, OnDestroy {
  docked = false;
  pressing = false;
  menuOpen = false;

  private timer?: ReturnType<typeof setTimeout>;
  private long = false;
  private subs = new Subscription();

  constructor(private access: AiAccessService, private nav: NavController, private host: ElementRef<HTMLElement>) {}

  get visible(): boolean {
    return this.docked && this.access.canUseAi();
  }

  ngOnInit(): void {
    this.docked = this.access.isFabHidden();
    this.subs.add(this.access.fabChanged$.subscribe(() => {
      this.docked = this.access.isFabHidden();
      this.menuOpen = false;
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    clearTimeout(this.timer);
  }

  onDown(): void {
    this.pressing = true;
    this.long = false;
    this.timer = setTimeout(() => {
      this.long = true;
      this.pressing = false;
      this.menuOpen = true;
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
  }

  onUp(): void {
    clearTimeout(this.timer);
    this.pressing = false;
    if (this.long) { this.long = false; return; } // se abrió el menú al mantener presionado
    this.open();
  }

  cancel(): void {
    clearTimeout(this.timer);
    this.pressing = false;
  }

  /** Clic derecho (computador): mismo menú que al mantener presionado. */
  onContextMenu(ev: Event): void {
    ev.preventDefault();
    this.cancel();
    this.menuOpen = true;
  }

  open(): void {
    const r = this.host.nativeElement.getBoundingClientRect?.();
    this.access.setLaunchOrigin({ x: (r?.left ?? 0) + (r?.width ?? 0) / 2, y: (r?.top ?? 0) + (r?.height ?? 0) / 2 });
    this.nav.navigateForward(['/ia'], { animated: false });
  }

  /** Vuelve a flotar sobre todas las pantallas. */
  followMode(): void {
    this.menuOpen = false;
    this.access.showFab();
  }
}
