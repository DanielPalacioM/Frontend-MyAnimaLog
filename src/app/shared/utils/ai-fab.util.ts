// Geometría del botón flotante de la IA: arrastrar, pegarse a un borde y soltar sobre la zona "Ocultar".

export const FAB_SIZE = 52;
export const FAB_MARGIN = 10;
export const DROP_RADIUS = 40;
/** Movimiento (px) a partir del cual un toque pasa a ser arrastre. */
export const DRAG_THRESHOLD = 6;
/** Tiempo (ms) que hay que mantener presionado para abrir el chat completo. */
export const LONG_PRESS_MS = 450;

export interface Bounds {
  width: number;
  height: number;
  /** Espacio reservado arriba (barra de estado, header). */
  top: number;
  /** Espacio reservado abajo (tab bar). */
  bottom: number;
}

export interface FabPos { x: number; y: number; }
export interface FabStored { side: 'left' | 'right'; yFrac: number; }

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Mantiene la esquina superior izquierda del botón dentro de la pantalla útil. */
export function clampPos(p: FabPos, b: Bounds): FabPos {
  return {
    x: clamp(p.x, FAB_MARGIN, b.width - FAB_SIZE - FAB_MARGIN),
    y: clamp(p.y, b.top, b.height - b.bottom - FAB_SIZE),
  };
}

/** Al soltar, el botón se pega al borde horizontal más cercano. */
export function snapToSide(p: FabPos, b: Bounds): { pos: FabPos; side: 'left' | 'right' } {
  const c = clampPos(p, b);
  const side = c.x + FAB_SIZE / 2 < b.width / 2 ? 'left' : 'right';
  return { side, pos: { x: side === 'left' ? FAB_MARGIN : b.width - FAB_SIZE - FAB_MARGIN, y: c.y } };
}

export function toStored(p: FabPos, side: 'left' | 'right', b: Bounds): FabStored {
  const range = Math.max(1, b.height - b.bottom - FAB_SIZE - b.top);
  return { side, yFrac: clamp((p.y - b.top) / range, 0, 1) };
}

export function fromStored(s: FabStored | null, b: Bounds): { pos: FabPos; side: 'left' | 'right' } {
  const side = s?.side ?? 'right';
  const range = Math.max(1, b.height - b.bottom - FAB_SIZE - b.top);
  // Sin posición guardada: abajo a la derecha, por encima de la barra inferior.
  const y = s ? b.top + s.yFrac * range : b.top + range * 0.88;
  return snapToSide({ x: side === 'left' ? FAB_MARGIN : b.width - FAB_SIZE - FAB_MARGIN, y }, b);
}

/** Círculo "Ocultar" que aparece mientras se arrastra: abajo, al centro. */
export function dropZone(b: Bounds): { x: number; y: number; r: number } {
  return { x: b.width / 2, y: b.height - b.bottom - 28, r: DROP_RADIUS };
}

/** ¿El centro del botón está sobre la zona de ocultar? (con un poco de holgura) */
export function isOverDropZone(pos: FabPos, zone: { x: number; y: number; r: number }): boolean {
  const cx = pos.x + FAB_SIZE / 2;
  const cy = pos.y + FAB_SIZE / 2;
  return Math.hypot(cx - zone.x, cy - zone.y) <= zone.r + 18;
}

export function isTap(dx: number, dy: number, elapsedMs: number): boolean {
  return Math.hypot(dx, dy) < DRAG_THRESHOLD && elapsedMs < LONG_PRESS_MS;
}

/** Pantallas donde NO aparece el botón: la entrada a la app y el propio chat. En todas las demás acompaña al usuario. */
const FAB_HIDDEN_ROUTES = ['/login', '/register', '/verify-email', '/reset-password', '/recover-password', '/ia'];

export function fabVisibleOn(url: string): boolean {
  const path = (url || '').split('?')[0].split('#')[0];
  if (path === '' || path === '/') return false; // todavía redirigiendo al login o al Home
  return !FAB_HIDDEN_ROUTES.some(r => path === r || path.startsWith(`${r}/`));
}
