import { fakeAsync, flush, tick } from '@angular/core/testing';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { LONG_PRESS_MS } from 'src/app/shared/utils/ai-fab.util';
import { AiDockComponent } from './ai-dock.component';

describe('AiDockComponent (modo anclado, junto al menú del Inicio)', () => {
  let access: AiAccessService;
  let nav: { navigateForward: jasmine.Spy };

  const make = (hidden = true) => {
    localStorage.setItem('userId', 'u-dock');
    access = new AiAccessService();
    if (hidden) access.hideFab();
    nav = { navigateForward: jasmine.createSpy('navigateForward') };
    const host = { nativeElement: { getBoundingClientRect: () => ({ left: 300, top: 20, width: 34, height: 34 }) } };
    const c = new AiDockComponent(access, nav as any, host as any);
    c.ngOnInit();
    return c;
  };

  afterEach(() => ['aiFabHidden_u-dock', 'userId'].forEach(k => localStorage.removeItem(k)));

  it('solo aparece cuando el botón está anclado (y el plan lo permite)', () => {
    expect(make(false).visible).toBeFalse();
    const c = make(true);
    expect(c.visible).toBeTrue();
    spyOn(access, 'canUseAi').and.returnValue(false);
    expect(c.visible).toBeFalse();
  });

  it('aparece y desaparece al cambiar de modo, sin recargar', () => {
    const c = make(false);
    expect(c.visible).toBeFalse();
    access.hideFab();
    expect(c.visible).toBeTrue();
    access.showFab();
    expect(c.visible).toBeFalse();
  });

  it('un toque abre el chat completo, con la animación saliendo del botón', () => {
    const c = make();
    c.onDown();
    c.onUp();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/ia'], { animated: false });
    expect(access.takeLaunchOrigin()).toEqual({ x: 317, y: 37 });
    expect(c.menuOpen).toBeFalse();
  });

  it('mantenerlo presionado ofrece volver al modo seguimiento (y no abre el chat)', fakeAsync(() => {
    const c = make();
    c.onDown();
    expect(c.pressing).toBeTrue();
    tick(LONG_PRESS_MS + 10);
    expect(c.menuOpen).toBeTrue();
    expect(c.pressing).toBeFalse();
    c.onUp();
    expect(nav.navigateForward).not.toHaveBeenCalled();
    flush();
  }));

  it('"Volver al modo seguimiento" lo devuelve a flotar y deja de verse junto al menú', fakeAsync(() => {
    const c = make();
    c.onDown();
    tick(LONG_PRESS_MS + 10);
    c.onUp();
    c.followMode();
    expect(access.isFabHidden()).toBeFalse();
    expect(c.menuOpen).toBeFalse();
    expect(c.visible).toBeFalse();
    flush();
  }));

  it('soltar antes del tiempo no abre el menú; salirse del botón cancela', fakeAsync(() => {
    const c = make();
    c.onDown();
    c.cancel();
    tick(LONG_PRESS_MS + 100);
    expect(c.menuOpen).toBeFalse();
    expect(c.pressing).toBeFalse();
    flush();
  }));

  it('con clic derecho (computador) abre el mismo menú', () => {
    const c = make();
    const preventDefault = jasmine.createSpy();
    c.onContextMenu({ preventDefault } as unknown as Event);
    expect(preventDefault).toHaveBeenCalled();
    expect(c.menuOpen).toBeTrue();
  });
});
