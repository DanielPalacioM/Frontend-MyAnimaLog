import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import {
  Bounds, DRAG_THRESHOLD, FAB_SIZE, FabPos, LONG_PRESS_MS, clampPos, dropZone, fabVisibleOn, fromStored, isOverDropZone, isTap,
  snapToSide, toStored,
} from 'src/app/shared/utils/ai-fab.util';

/**
 * Botón de la IA en **modo seguimiento**: flota sobre todas las pantallas, naranja y con el logo del perro.
 * - Un toque abre el **mini chat** (panel lateral) para pedirle cosas sin salir de la pantalla.
 * - Mantenerlo presionado abre el **chat completo**.
 * - Arrastrarlo lo mueve (y se pega al borde). Al arrastrar aparece "Ocultar": soltarlo ahí lo **ancla junto al menú (≡)
 *   del Inicio** (`AiDockComponent`), de donde se puede volver al modo seguimiento.
 * Se muestra solo si el usuario puede usar la IA (`AiAccessService.canUseAi`, hoy sin plan).
 */
@Component({
  selector: 'app-ai-fab',
  templateUrl: './ai-fab.component.html',
  styleUrls: ['./ai-fab.component.scss'],
  standalone: false
})
export class AiFabComponent implements OnInit, OnDestroy {
  readonly size = FAB_SIZE;

  routeOk = false;
  /** Modo anclado: el botón ya no flota, vive junto al menú del Inicio. */
  docked = false;
  pos: FabPos = { x: 0, y: 0 };
  side: 'left' | 'right' = 'right';
  zone = { x: 0, y: 0, r: 40 };

  dragging = false;
  /** Presionado (para el efecto de "se hunde"). */
  pressing = false;
  overZone = false;
  snapping = false;
  bubbleOpen = false;

  private bounds: Bounds = { width: 360, height: 700, top: 56, bottom: 84 };
  private start: { x: number; y: number; t: number; px: number; py: number } | null = null;
  private longPress?: ReturnType<typeof setTimeout>;
  private longPressed = false;
  private bubbleTimers: ReturnType<typeof setTimeout>[] = [];
  private subs = new Subscription();

  constructor(
    private router: Router,
    private nav: NavController,
    private access: AiAccessService,
    private toast: ToastController
  ) {}

  get visible(): boolean {
    return this.routeOk && !this.docked && this.access.canUseAi();
  }

  ngOnInit(): void {
    this.measure();
    this.refreshDocked();
    this.onRoute(this.router.url);
    this.subs.add(
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(e => this.onRoute(e.urlAfterRedirects))
    );
    this.subs.add(this.access.fabChanged$.subscribe(() => { this.refreshDocked(); if (this.visible) this.restorePosition(); }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.clearBubbleTimers();
    clearTimeout(this.longPress);
  }

  private onRoute(url: string): void {
    this.routeOk = fabVisibleOn(url);
    this.refreshDocked(); // el usuario pudo cambiar (cerrar sesión y entrar con otra cuenta)
    if (this.visible) {
      this.measure();
      this.restorePosition();
      if (url.split('?')[0] === '/home') this.greetOncePerSession();
    } else {
      this.bubbleOpen = false;
      this.clearBubbleTimers();
    }
  }

  private refreshDocked(): void {
    this.docked = this.access.isFabHidden();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.measure();
    this.restorePosition();
  }

  private measure(): void {
    this.bounds = { width: window.innerWidth, height: window.innerHeight, top: 56, bottom: 84 };
    this.zone = dropZone(this.bounds);
  }

  private restorePosition(): void {
    const r = fromStored(this.access.getFabPosition(), this.bounds);
    this.pos = r.pos;
    this.side = r.side;
  }

  // ---------------------------------------------------------------- Mensajito

  /** La primera vez que se entra al Home en cada sesión, la IA saluda con un mensajito que se va solo. */
  private greetOncePerSession(): void {
    let greeted = false;
    try { greeted = sessionStorage.getItem('aiFabGreeted') === 'true'; } catch { /* nada */ }
    if (greeted) return;
    try { sessionStorage.setItem('aiFabGreeted', 'true'); } catch { /* nada */ }
    this.bubbleTimers.push(setTimeout(() => (this.bubbleOpen = true), 1400));
    this.bubbleTimers.push(setTimeout(() => (this.bubbleOpen = false), 1400 + 7000));
  }

  closeBubble(ev?: Event): void {
    ev?.stopPropagation();
    this.bubbleOpen = false;
    this.clearBubbleTimers();
  }

  private clearBubbleTimers(): void {
    this.bubbleTimers.forEach(clearTimeout);
    this.bubbleTimers = [];
  }

  // ---------------------------------------------------------------- Gestos

  onPointerDown(ev: PointerEvent): void {
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    this.start = { x: ev.clientX, y: ev.clientY, t: Date.now(), px: this.pos.x, py: this.pos.y };
    this.snapping = false;
    this.pressing = true;
    this.longPressed = false;
    this.bubbleOpen = false;
    // Mantenido presionado sin moverse: abre el chat completo (sin esperar a que suelte).
    this.longPress = setTimeout(() => {
      this.longPressed = true;
      this.pressing = false;
      navigator.vibrate?.(15);
      this.openFull();
    }, LONG_PRESS_MS);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.start || this.longPressed) return;
    const dx = ev.clientX - this.start.x;
    const dy = ev.clientY - this.start.y;
    if (!this.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      this.dragging = true;
      clearTimeout(this.longPress); // arrastrar cancela el "mantener presionado"
    }
    if (!this.dragging) return;
    this.pos = clampPos({ x: this.start.px + dx, y: this.start.py + dy }, this.bounds);
    this.overZone = isOverDropZone(this.pos, this.zone);
  }

  onPointerUp(ev: PointerEvent): void {
    clearTimeout(this.longPress);
    const s = this.start;
    this.start = null;
    this.pressing = false;
    if (!s) return;
    (ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId);

    const wasDragging = this.dragging;
    const over = this.overZone;
    const wasLong = this.longPressed;
    this.dragging = false;
    this.overZone = false;
    this.longPressed = false;

    if (wasLong) return; // el chat completo ya se abrió al mantener presionado
    if (wasDragging) {
      if (over) { void this.dock(); return; }
      this.snapAndSave();
    } else if (isTap(ev.clientX - s.x, ev.clientY - s.y, Date.now() - s.t)) {
      this.openMini();
    }
  }

  onPointerCancel(): void {
    clearTimeout(this.longPress);
    this.start = null;
    this.pressing = false;
    this.longPressed = false;
    if (this.dragging) this.snapAndSave();
    this.dragging = false;
    this.overZone = false;
  }

  private snapAndSave(): void {
    const r = snapToSide(this.pos, this.bounds);
    this.snapping = true;
    this.pos = r.pos;
    this.side = r.side;
    this.access.saveFabPosition(toStored(r.pos, r.side, this.bounds));
  }

  // ---------------------------------------------------------------- Acciones

  /** Un toque: abre o cierra el mini chat de la pantalla actual. */
  openMini(): void {
    this.closeBubble();
    this.access.toggleMini();
  }

  /** Mantenido presionado: chat completo, con la animación que sale desde el botón. */
  openFull(): void {
    this.closeBubble();
    this.access.closeMini();
    this.access.setLaunchOrigin({ x: this.pos.x + FAB_SIZE / 2, y: this.pos.y + FAB_SIZE / 2 });
    // Sin la transición de página de Ionic: la entrada la anima el propio chat (círculo que crece desde el botón).
    this.nav.navigateForward(['/ia'], { animated: false });
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.openMini();
    }
  }

  /** Soltado sobre "Ocultar": pasa al modo anclado, junto al menú (≡) del Inicio. */
  private async dock(): Promise<void> {
    this.access.hideFab();
    this.docked = true;
    const t = await this.toast.create({
      message: 'Dejé el botón de IA junto al menú (≡) del Inicio. Mantenlo presionado ahí para volver a verlo flotando.',
      duration: 4200,
      position: 'bottom', // abajo: arriba taparía el botón que acaba de quedar junto al menú
    });
    await t.present();
  }
}
