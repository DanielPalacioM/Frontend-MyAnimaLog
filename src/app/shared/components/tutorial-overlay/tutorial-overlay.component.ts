import {
  Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { TutorialStep } from 'src/app/services/TutorialService/tutorial';

interface Box { top: number; left: number; width: number; height: number; }

const SPOT_PADDING = 6;
const BUBBLE_MAX_WIDTH = 340;
const BUBBLE_MIN_SPACE = 190;   // alto aprox. de la burbuja para decidir si cabe arriba/abajo
const SCROLL_SETTLE_MS = 380;

/**
 * Tutorial interactivo: oscurece la pantalla, resalta el elemento con
 * `data-tour="<target>"` de la vista actual y muestra una burbuja con la
 * explicación. Se usa dentro de <ion-content> con slot="fixed".
 */
@Component({
  selector: 'app-tutorial-overlay',
  templateUrl: './tutorial-overlay.component.html',
  styleUrls: ['./tutorial-overlay.component.scss'],
  standalone: false
})
export class TutorialOverlayComponent implements OnChanges, OnDestroy {

  @Input() steps: TutorialStep[] = [];
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('overlay') overlayRef?: ElementRef<HTMLDivElement>;

  activeSteps: TutorialStep[] = [];
  index = 0;
  ready = false;

  spot: Box | null = null;
  placement: 'top' | 'bottom' | 'center' | 'inside' = 'center';
  bubbleTop: number | null = null;
  bubbleBottom: number | null = null;
  arrowLeft = 0;

  private timer?: ReturnType<typeof setTimeout>;

  constructor(private host: ElementRef<HTMLElement>) {}

  get current(): TutorialStep { return this.activeSteps[this.index]; }
  get isLast(): boolean { return this.index === this.activeSteps.length - 1; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.start();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.open && this.activeSteps.length) this.locate(false);
  }

  next(): void {
    if (this.isLast) {
      this.finish();
      return;
    }
    this.index++;
    this.locate(true);
  }

  prev(): void {
    if (this.index === 0) return;
    this.index--;
    this.locate(true);
  }

  finish(): void {
    clearTimeout(this.timer);
    this.ready = false;
    this.activeSteps = [];
    this.closed.emit();
  }

  private start(): void {
    this.ready = false;
    this.index = 0;
    // Se espera un ciclo para que la vista pinte los datos recién cargados.
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.activeSteps = this.steps.filter(s => !s.target || this.findTarget(s.target));
      if (!this.activeSteps.length) {
        this.finish();
        return;
      }
      this.locate(true);
    }, 60);
  }

  /** Busca solo dentro de la página actual: Ionic deja las anteriores en el DOM. */
  private findTarget(name: string): HTMLElement | null {
    const scope: ParentNode = this.host.nativeElement.closest('.ion-page') || document;
    let el = scope.querySelector<HTMLElement>(`[data-tour="${name}"]`);
    if (!el) return null;

    // Los componentes Angular son "inline" por defecto y miden 0; se usa su primer hijo.
    if (el.getBoundingClientRect().height === 0 && el.firstElementChild) {
      el = el.firstElementChild as HTMLElement;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? el : null;
  }

  private locate(scroll: boolean): void {
    clearTimeout(this.timer);
    const target = this.current.target ? this.findTarget(this.current.target) : null;

    if (!target) {
      this.spot = null;
      this.placement = 'center';
      this.ready = true;
      return;
    }

    if (scroll) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.timer = setTimeout(() => this.measure(target), scroll ? SCROLL_SETTLE_MS : 0);
  }

  private measure(target: HTMLElement): void {
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) return;

    // Coordenadas relativas al overlay (no al viewport) por si algún
    // contenedor de Ionic tiene transform durante la transición.
    const area = overlay.getBoundingClientRect();
    const r = target.getBoundingClientRect();

    const spot: Box = {
      top: r.top - area.top - SPOT_PADDING,
      left: r.left - area.left - SPOT_PADDING,
      width: r.width + SPOT_PADDING * 2,
      height: r.height + SPOT_PADDING * 2,
    };
    this.spot = spot;

    const spaceBelow = area.height - (spot.top + spot.height);
    const spaceAbove = spot.top;
    this.bubbleTop = null;
    this.bubbleBottom = null;

    if (spaceBelow >= BUBBLE_MIN_SPACE) {
      this.placement = 'bottom';
      this.bubbleTop = spot.top + spot.height + 14;
    } else if (spaceAbove >= BUBBLE_MIN_SPACE) {
      this.placement = 'top';
      this.bubbleBottom = area.height - spot.top + 14;
    } else {
      // Elemento más alto que la pantalla: la burbuja va encima, abajo.
      this.placement = 'inside';
      this.bubbleBottom = 24;
    }

    const bubbleWidth = Math.min(area.width - 32, BUBBLE_MAX_WIDTH);
    const bubbleLeft = (area.width - bubbleWidth) / 2;
    const center = spot.left + spot.width / 2 - bubbleLeft;
    this.arrowLeft = Math.min(Math.max(center, 22), bubbleWidth - 22);

    this.ready = true;
  }
}
