import { environment } from 'src/environments/environment';
import { AiAccessService } from './ai-access';

describe('AiAccessService', () => {
  let service: AiAccessService;
  const original = environment.ai.requiresPlan;

  beforeEach(() => {
    localStorage.setItem('userId', 'u-ia');
    service = new AiAccessService();
  });

  afterEach(() => {
    environment.ai.requiresPlan = original;
    ['aiFabHidden_u-ia', 'aiFabPos_u-ia', 'aiFabHidden_otro', 'userId'].forEach(k => localStorage.removeItem(k));
  });

  describe('plan', () => {
    it('por ahora se valida sin plan: todos pueden usar la IA', () => {
      expect(environment.ai.requiresPlan).toBeFalse();
      expect(service.canUseAi()).toBeTrue();
    });

    it('cuando el plan sea obligatorio y no haya plan de pago, no pasa', () => {
      environment.ai.requiresPlan = true;
      expect(service.canUseAi()).toBeFalse();
    });
  });

  describe('botón flotante', () => {
    it('se oculta y se vuelve a mostrar, y avisa del cambio', () => {
      let changes = 0;
      service.fabChanged$.subscribe(() => changes++);
      expect(service.isFabHidden()).toBeFalse();
      service.hideFab();
      expect(service.isFabHidden()).toBeTrue();
      service.showFab();
      expect(service.isFabHidden()).toBeFalse();
      expect(changes).toBe(2);
    });

    it('lo oculto es por usuario', () => {
      service.hideFab();
      localStorage.setItem('userId', 'otro');
      expect(service.isFabHidden()).toBeFalse();
    });

    it('guarda y recupera la posición; un valor dañado se ignora', () => {
      expect(service.getFabPosition()).toBeNull();
      service.saveFabPosition({ side: 'left', yFrac: 0.4 });
      expect(service.getFabPosition()).toEqual({ side: 'left', yFrac: 0.4 });
      localStorage.setItem('aiFabPos_u-ia', '{"side":"arriba","yFrac":"x"}');
      expect(service.getFabPosition()).toBeNull();
      localStorage.setItem('aiFabPos_u-ia', 'no es json');
      expect(service.getFabPosition()).toBeNull();
    });
  });

  describe('mini chat del modo seguimiento', () => {
    it('se abre, se cierra y alterna', () => {
      expect(service.miniOpen$.value).toBeFalse();
      service.openMini();
      expect(service.miniOpen$.value).toBeTrue();
      service.toggleMini();
      expect(service.miniOpen$.value).toBeFalse();
      service.toggleMini();
      expect(service.miniOpen$.value).toBeTrue();
      service.closeMini();
      expect(service.miniOpen$.value).toBeFalse();
    });

    it('anclar el botón cierra el mini chat', () => {
      service.openMini();
      service.hideFab();
      expect(service.miniOpen$.value).toBeFalse();
    });
  });

  it('el origen de la animación se entrega una sola vez', () => {
    service.setLaunchOrigin({ x: 300, y: 600 });
    expect(service.takeLaunchOrigin()).toEqual({ x: 300, y: 600 });
    expect(service.takeLaunchOrigin()).toBeNull();
  });
});
