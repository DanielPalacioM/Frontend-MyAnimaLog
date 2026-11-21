import {
  Bounds, DRAG_THRESHOLD, DROP_RADIUS, FAB_MARGIN, FAB_SIZE, LONG_PRESS_MS, clampPos, dropZone, fabVisibleOn, fromStored, isOverDropZone, isTap,
  snapToSide, toStored,
} from './ai-fab.util';

describe('ai-fab.util', () => {
  const b: Bounds = { width: 360, height: 740, top: 56, bottom: 84 };

  it('clampPos mantiene el botón dentro de la pantalla útil', () => {
    expect(clampPos({ x: -50, y: -50 }, b)).toEqual({ x: FAB_MARGIN, y: 56 });
    expect(clampPos({ x: 999, y: 999 }, b)).toEqual({ x: 360 - FAB_SIZE - FAB_MARGIN, y: 740 - 84 - FAB_SIZE });
    expect(clampPos({ x: 100, y: 300 }, b)).toEqual({ x: 100, y: 300 });
  });

  it('snapToSide lo pega al borde más cercano', () => {
    expect(snapToSide({ x: 60, y: 300 }, b)).toEqual({ side: 'left', pos: { x: FAB_MARGIN, y: 300 } });
    expect(snapToSide({ x: 250, y: 300 }, b)).toEqual({ side: 'right', pos: { x: 360 - FAB_SIZE - FAB_MARGIN, y: 300 } });
    // justo en el centro cae a la derecha
    expect(snapToSide({ x: 180 - FAB_SIZE / 2, y: 300 }, b).side).toBe('right');
  });

  it('guardar y recuperar la posición (lado y altura relativa)', () => {
    const { pos, side } = snapToSide({ x: 300, y: 250 }, b);
    const stored = toStored(pos, side, b);
    expect(stored.side).toBe('right');
    expect(stored.yFrac).toBeGreaterThan(0);
    expect(stored.yFrac).toBeLessThan(1);
    expect(fromStored(stored, b).pos).toEqual(pos);

    // En otra pantalla (otro alto) conserva la altura relativa
    const tall: Bounds = { ...b, height: 900 };
    const again = fromStored(stored, tall);
    expect(again.side).toBe('right');
    expect(again.pos.y).toBeGreaterThan(pos.y);
  });

  it('sin posición guardada aparece abajo a la derecha, sobre la barra inferior', () => {
    const r = fromStored(null, b);
    expect(r.side).toBe('right');
    expect(r.pos.x).toBe(360 - FAB_SIZE - FAB_MARGIN);
    expect(r.pos.y + FAB_SIZE).toBeLessThanOrEqual(740 - 84);
    expect(r.pos.y).toBeGreaterThan(740 / 2);
  });

  it('un yFrac fuera de rango no saca el botón de la pantalla', () => {
    expect(toStored({ x: 0, y: -999 }, 'left', b).yFrac).toBe(0);
    expect(toStored({ x: 0, y: 9999 }, 'left', b).yFrac).toBe(1);
  });

  it('la zona de ocultar está abajo y al centro', () => {
    const z = dropZone(b);
    expect(z.x).toBe(180);
    expect(z.r).toBe(DROP_RADIUS);
    expect(z.y).toBeGreaterThan(740 / 2);
    expect(z.y).toBeLessThan(740);
  });

  it('isOverDropZone usa el centro del botón', () => {
    const z = dropZone(b);
    expect(isOverDropZone({ x: z.x - FAB_SIZE / 2, y: z.y - FAB_SIZE / 2 }, z)).toBeTrue();
    expect(isOverDropZone({ x: z.x - FAB_SIZE / 2 + 30, y: z.y - FAB_SIZE / 2 }, z)).toBeTrue(); // dentro de la holgura
    expect(isOverDropZone({ x: 10, y: 100 }, z)).toBeFalse();
    expect(isOverDropZone({ x: z.x + 200, y: z.y }, z)).toBeFalse();
  });

  it('isTap: poco movimiento y rápido', () => {
    expect(isTap(0, 0, 100)).toBeTrue();
    expect(isTap(DRAG_THRESHOLD - 1, 0, 100)).toBeTrue();
    expect(isTap(DRAG_THRESHOLD + 1, 0, 100)).toBeFalse();
    expect(isTap(0, 0, LONG_PRESS_MS + 10)).toBeFalse();
  });

  it('fabVisibleOn: acompaña a todas las pantallas menos la entrada a la app y el chat', () => {
    for (const u of ['/home', '/home?x=1', '/pet-profile/abc', '/calendar', '/calendar/add-event?type=OTHER', '/shared-profiles', '/shared-profiles-home',
      '/vet', '/vet/detail/9', '/maps', '/notifications', '/profile', '/add-pet', '/documents/abc', '/medical-history/1', '/pet-clinics/9']) {
      expect(fabVisibleOn(u)).withContext(u).toBeTrue();
    }
    for (const u of ['/ia', '/ia?x=1', '/login', '/register', '/verify-email', '/reset-password/abc', '/recover-password', '', '/']) {
      expect(fabVisibleOn(u)).withContext(u).toBeFalse();
    }
    // Parecerse a una ruta oculta no la oculta
    expect(fabVisibleOn('/iaxyz')).toBeTrue();
  });
});
