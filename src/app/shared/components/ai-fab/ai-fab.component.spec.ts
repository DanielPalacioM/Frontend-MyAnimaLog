import { fakeAsync, flush, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { FAB_MARGIN, FAB_SIZE, LONG_PRESS_MS, dropZone } from 'src/app/shared/utils/ai-fab.util';
import { AiFabComponent } from './ai-fab.component';

// Pantalla de 360 x 740 (los límites se fijan a mano para no depender del tamaño de la ventana de pruebas).
describe('AiFabComponent (modo seguimiento)', () => {
  let access: AiAccessService;
  let nav: { navigateForward: jasmine.Spy };
  let toast: { create: jasmine.Spy };
  let router: { url: string; events: Subject<unknown> };

  const make = () => {
    localStorage.setItem('userId', 'u-fab');
    access = new AiAccessService();
    nav = { navigateForward: jasmine.createSpy('navigateForward') };
    toast = { create: jasmine.createSpy('toast').and.returnValue(Promise.resolve({ present: () => Promise.resolve() })) };
    router = { url: '/home', events: new Subject() };
    const c = new AiFabComponent(router as any, nav as any, access, toast as any);
    (c as any).bounds = { width: 360, height: 740, top: 56, bottom: 84 };
    c.zone = dropZone((c as any).bounds);
    (c as any).restorePosition();
    c.routeOk = true;
    return c;
  };

  const el = () => ({ setPointerCapture: () => undefined, releasePointerCapture: () => undefined });
  const ev = (x: number, y: number) => ({ clientX: x, clientY: y, pointerId: 1, currentTarget: el() } as unknown as PointerEvent);

  afterEach(() => ['aiFabHidden_u-fab', 'aiFabPos_u-fab', 'userId'].forEach(k => localStorage.removeItem(k)));

  it('aparece abajo a la derecha por defecto, y solo si la ruta, el modo y el plan lo permiten', () => {
    const c = make();
    expect(c.visible).toBeTrue();
    expect(c.side).toBe('right');
    expect(c.pos.x).toBe(360 - FAB_SIZE - FAB_MARGIN);

    c.routeOk = false;
    expect(c.visible).toBeFalse();
    c.routeOk = true;
    c.docked = true; // en modo anclado ya no flota
    expect(c.visible).toBeFalse();
    c.docked = false;
    spyOn(access, 'canUseAi').and.returnValue(false); // futuro: plan de pago requerido y sin plan
    expect(c.visible).toBeFalse();
  });

  describe('un toque', () => {
    it('abre el mini chat de la pantalla y otro toque lo cierra', () => {
      const c = make();
      c.onPointerDown(ev(300, 600));
      c.onPointerUp(ev(301, 600));
      expect(access.miniOpen$.value).toBeTrue();
      expect(nav.navigateForward).not.toHaveBeenCalled();

      c.onPointerDown(ev(300, 600));
      c.onPointerUp(ev(300, 600));
      expect(access.miniOpen$.value).toBeFalse();
    });

    it('con el teclado, Enter abre el mini chat', () => {
      const c = make();
      const preventDefault = jasmine.createSpy();
      c.onKeydown({ key: 'Enter', preventDefault } as unknown as KeyboardEvent);
      expect(preventDefault).toHaveBeenCalled();
      expect(access.miniOpen$.value).toBeTrue();
    });

    it('tocar el mensajito también abre el mini chat y lo cierra', () => {
      const c = make();
      c.bubbleOpen = true;
      c.openMini();
      expect(c.bubbleOpen).toBeFalse();
      expect(access.miniOpen$.value).toBeTrue();
    });
  });

  describe('mantenerlo presionado', () => {
    it('abre el chat completo sin esperar a que suelte, con la animación desde el botón', fakeAsync(() => {
      const c = make();
      const center = { x: c.pos.x + FAB_SIZE / 2, y: c.pos.y + FAB_SIZE / 2 };
      c.onPointerDown(ev(300, 600));
      expect(nav.navigateForward).not.toHaveBeenCalled();
      tick(LONG_PRESS_MS + 10);
      expect(nav.navigateForward).toHaveBeenCalledWith(['/ia'], { animated: false });
      expect(access.takeLaunchOrigin()).toEqual(center);
      flush();
    }));

    it('al soltar después no vuelve a abrir el mini chat', fakeAsync(() => {
      const c = make();
      c.onPointerDown(ev(300, 600));
      tick(LONG_PRESS_MS + 10);
      c.onPointerUp(ev(300, 600));
      expect(access.miniOpen$.value).toBeFalse();
      expect(nav.navigateForward).toHaveBeenCalledTimes(1);
      flush();
    }));

    it('cierra el mini chat si estaba abierto', fakeAsync(() => {
      const c = make();
      access.openMini();
      c.onPointerDown(ev(300, 600));
      tick(LONG_PRESS_MS + 10);
      expect(access.miniOpen$.value).toBeFalse();
      flush();
    }));

    it('arrastrar cancela el "mantener presionado": no abre el chat aunque pase el tiempo', fakeAsync(() => {
      const c = make();
      c.onPointerDown(ev(300, 600));
      c.onPointerMove(ev(200, 500));
      tick(LONG_PRESS_MS + 200);
      expect(nav.navigateForward).not.toHaveBeenCalled();
      c.onPointerUp(ev(200, 500));
      flush();
    }));
  });

  describe('arrastrar', () => {
    it('mueve el botón, muestra la zona "Ocultar" y al soltar se pega al borde y se guarda (sin abrir nada)', () => {
      const c = make();
      c.onPointerDown(ev(300, 600));
      c.onPointerMove(ev(150, 400));
      expect(c.dragging).toBeTrue();
      expect(c.overZone).toBeFalse();
      c.onPointerUp(ev(150, 400));

      expect(nav.navigateForward).not.toHaveBeenCalled();
      expect(access.miniOpen$.value).toBeFalse();
      expect(c.dragging).toBeFalse();
      expect(c.side).toBe('left');
      expect(c.pos.x).toBe(FAB_MARGIN);
      expect(access.getFabPosition()?.side).toBe('left');
    });

    it('soltarlo sobre "Ocultar" lo ancla junto al menú del Inicio, lo recuerda y explica cómo volver', fakeAsync(() => {
      const c = make();
      const z = c.zone;
      c.onPointerDown(ev(c.pos.x + FAB_SIZE / 2, c.pos.y + FAB_SIZE / 2));
      c.onPointerMove(ev(z.x, z.y));
      expect(c.overZone).toBeTrue();
      c.onPointerUp(ev(z.x, z.y));
      flush();

      expect(c.docked).toBeTrue();
      expect(c.visible).toBeFalse();
      expect(access.isFabHidden()).toBeTrue();
      expect(nav.navigateForward).not.toHaveBeenCalled();
      const message = toast.create.calls.mostRecent().args[0].message as string;
      expect(message).toContain('junto al menú');
      expect(message).toContain('presionado');
    }));

    it('anclarlo cierra el mini chat', fakeAsync(() => {
      const c = make();
      access.openMini();
      c.onPointerDown(ev(c.pos.x + FAB_SIZE / 2, c.pos.y + FAB_SIZE / 2));
      c.onPointerMove(ev(c.zone.x, c.zone.y));
      c.onPointerUp(ev(c.zone.x, c.zone.y));
      flush();
      expect(access.miniOpen$.value).toBeFalse();
    }));

    it('cancelar el gesto (por ejemplo, el sistema toma el control) no abre nada ni lo ancla', () => {
      const c = make();
      c.onPointerDown(ev(300, 600));
      c.onPointerMove(ev(200, 300));
      c.onPointerCancel();
      expect(c.dragging).toBeFalse();
      expect(c.docked).toBeFalse();
      expect(nav.navigateForward).not.toHaveBeenCalled();
    });

    it('la posición guardada se recupera al volver a entrar', () => {
      const c = make();
      c.onPointerDown(ev(300, 600));
      c.onPointerMove(ev(100, 300));
      c.onPointerUp(ev(100, 300));
      const saved = { side: c.side, y: c.pos.y };

      const again = make(); // otra "sesión": mismo usuario, localStorage conserva la posición
      expect(again.side).toBe(saved.side);
      expect(Math.abs(again.pos.y - saved.y)).toBeLessThan(1);
    });
  });

  it('al volver al modo seguimiento desde el menú del Inicio, el botón reaparece donde estaba', () => {
    const c = make();
    c.onPointerDown(ev(300, 600));
    c.onPointerMove(ev(100, 300));
    c.onPointerUp(ev(100, 300));
    const before = { side: c.side, y: c.pos.y };

    access.hideFab();
    (c as any).refreshDocked();
    expect(c.visible).toBeFalse();
    access.showFab();
    (c as any).refreshDocked();
    (c as any).restorePosition();
    expect(c.visible).toBeTrue();
    expect(c.side).toBe(before.side);
    expect(Math.abs(c.pos.y - before.y)).toBeLessThan(1);
  });

  it('el mensajito saluda una sola vez por sesión, solo en el Home, y se va solo', fakeAsync(() => {
    sessionStorage.removeItem('aiFabGreeted');
    const c = make();
    (c as any).onRoute('/pet-profile/1');
    tick(10_000);
    expect(c.bubbleOpen).toBeFalse(); // fuera del Home no saluda

    (c as any).onRoute('/home');
    tick(1500);
    expect(c.bubbleOpen).toBeTrue();
    tick(7100);
    expect(c.bubbleOpen).toBeFalse();

    c.bubbleOpen = false;
    (c as any).onRoute('/home');
    tick(10_000);
    expect(c.bubbleOpen).toBeFalse(); // ya saludó en esta sesión
    sessionStorage.removeItem('aiFabGreeted');
    flush();
    c.ngOnDestroy();
  }));
});
