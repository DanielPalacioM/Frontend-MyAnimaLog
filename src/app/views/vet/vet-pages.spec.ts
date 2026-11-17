import { of, throwError } from 'rxjs';
import { VetError } from 'src/app/models/veterinary.model';
import { VetPage } from './vet.page';
import { VetLinkPage } from './vet-link/vet-link.page';
import { VetDetailPage } from './vet-detail/vet-detail.page';
import { VetSharePage } from './vet-share/vet-share.page';

const err = (code: VetError['code'], status = 400): VetError => ({ code, status, message: '' });
const toastStub = { create: () => Promise.resolve({ present: () => Promise.resolve() }) } as any;
const flush = () => new Promise(r => setTimeout(r));

describe('Pantallas Vet del dueño', () => {
  describe('VetPage', () => {
    const vet = (over: any = {}) => ({ veterinaryId: 'A', name: 'A', logoUrl: null, city: '', phone: '', status: 'ACTIVE', linkedAt: '', sharedPetsCount: 0, ...over });
    const page = () => new VetPage({} as any, {} as any, {} as any);

    it('seesLabel antes de cruzar mascotas usa el contador', () => {
      const p = page();
      expect(p.seesLabel(vet())).toBe('Sin mascotas compartidas');
      expect(p.seesLabel(vet({ sharedPetsCount: 1 }))).toBe('Ve 1 mascota');
      expect(p.seesLabel(vet({ sharedPetsCount: 3 }))).toBe('Ve 3 mascotas');
    });

    it('seesLabel con nombres: "Ve a Milor y Juan"', () => {
      const p = page();
      p.sharing = new Map([['A', [{ id: '1', name: 'Milor' }, { id: '2', name: 'Juan' }]], ['B', [{ id: '1', name: 'Milor' }]], ['C', []]]);
      expect(p.seesLabel(vet({ veterinaryId: 'A' }))).toBe('Ve a Milor y Juan');
      expect(p.seesLabel(vet({ veterinaryId: 'B' }))).toBe('Ve a Milor');
      expect(p.seesLabel(vet({ veterinaryId: 'C' }))).toBe('Sin mascotas compartidas');
    });

    it('sin clínicas muestra el estado vacío; con error, el de error; con clínicas, la lista', () => {
      const svc: any = { getLinked: () => of([]), loadSharing: () => of(new Map()) };
      const pets: any = { getPets: () => of([]) };
      const p = new VetPage({} as any, svc, pets);
      p.load();
      expect(p.state).toBe('empty');

      svc.getLinked = () => throwError(() => err('NETWORK', 0));
      p.load();
      expect(p.state).toBe('error');

      svc.getLinked = () => of([vet()]);
      p.load();
      expect(p.state).toBe('list');
    });
  });

  describe('VetLinkPage', () => {
    const preview = { veterinaryId: 'V1', name: 'Clínica Patitas', logoUrl: null, city: 'Cartagena', department: '', address: '', alreadyLinked: false };
    const make = (svc: any, query: string | null = null) => {
      const router = { navigate: jasmine.createSpy('navigate') };
      const route: any = { snapshot: { queryParamMap: { get: () => query } } };
      return { page: new VetLinkPage(router as any, route, svc, toastStub), router };
    };

    it('un código mal escrito no llama al backend y muestra "Código no válido"', () => {
      const svc = { previewByCode: jasmine.createSpy() };
      const { page } = make(svc);
      page.onCodeInput('PATITAS-7Q4K');
      page.onContinue();
      expect(svc.previewByCode).not.toHaveBeenCalled();
      expect(page.error?.title).toBe('Código no válido');
    });

    it('un código válido pasa a la vista previa', () => {
      const svc = { previewByCode: jasmine.createSpy().and.returnValue(of(preview)) };
      const { page } = make(svc);
      page.onCodeInput('vet-7k2m9qxa');
      page.onContinue();
      expect(svc.previewByCode).toHaveBeenCalledWith('VET-7K2M9QXA');
      expect(page.step).toBe('preview');
      expect(page.preview?.name).toBe('Clínica Patitas');
    });

    it('404 LINK_CODE_NOT_FOUND se queda en el paso del código con el mensaje', () => {
      const svc = { previewByCode: () => throwError(() => err('LINK_CODE_NOT_FOUND', 404)) };
      const { page } = make(svc);
      page.onCodeInput('VET-AAAAAAAA');
      page.onContinue();
      expect(page.step).toBe('code');
      expect(page.error?.title).toBe('Código no válido');
      expect(page.busy).toBeFalse();
    });

    it('sin conexión muestra "No pudimos conectar"', () => {
      const svc = { previewByCode: () => throwError(() => err('NETWORK', 0)) };
      const { page } = make(svc);
      page.onCodeInput('VET-AAAAAAAA');
      page.onContinue();
      expect(page.error?.title).toBe('No pudimos conectar');
    });

    it('vincularse por primera vez lleva a Compartir mascotas', () => {
      const svc = {
        previewByCode: () => of(preview),
        link: () => of({ id: 'l', veterinaryId: 'V1', veterinaryName: 'Clínica Patitas', logoUrl: null, linkedAt: '', alreadyLinked: false }),
      };
      const { page, router } = make(svc);
      page.onCodeInput('VET-7K2M9QXA');
      page.onContinue();
      page.onLink();
      expect(router.navigate).toHaveBeenCalledWith(['/vet/share', 'V1'], { queryParams: { welcome: 1 }, replaceUrl: true });
    });

    it('si ya estaba vinculado lleva directo al detalle de la clínica', async () => {
      const svc = {
        previewByCode: () => of({ ...preview, alreadyLinked: true }),
        link: () => of({ id: 'l', veterinaryId: 'V1', veterinaryName: 'Clínica Patitas', logoUrl: null, linkedAt: '', alreadyLinked: true }),
      };
      const { page, router } = make(svc);
      page.onCodeInput('VET-7K2M9QXA');
      page.onContinue();
      page.onLink();
      await flush();
      expect(router.navigate).toHaveBeenCalledWith(['/vet/detail', 'V1'], { replaceUrl: true });
    });

    it('un código en la URL (deep link o QR) abre directo la vista previa', () => {
      const svc = { previewByCode: jasmine.createSpy().and.returnValue(of(preview)) };
      const { page } = make(svc, 'https://app/vet/link/vet-7k2m9qxa');
      page.ionViewWillEnter();
      expect(svc.previewByCode).toHaveBeenCalledWith('VET-7K2M9QXA');
      expect(page.step).toBe('preview');
    });

    it('escanear un QR rellena el código y busca la clínica', () => {
      const svc = { previewByCode: jasmine.createSpy().and.returnValue(of(preview)) };
      const { page } = make(svc);
      page.openScanner();
      page.onScanned('VET-7K2M9QXA');
      expect(page.scanning).toBeFalse();
      expect(page.code).toBe('VET-7K2M9QXA');
      expect(page.step).toBe('preview');
    });
  });

  describe('VetSharePage', () => {
    it('nada viene marcado de antemano y las ya compartidas no se pueden volver a elegir', () => {
      const p = new VetSharePage({} as any, {} as any, {} as any, {} as any, {} as any, toastStub);
      p.own = [
        { id: '1', name: 'Juan', subtitle: '', selected: false, alreadyShared: false },
        { id: '2', name: 'Milor', subtitle: '', selected: false, alreadyShared: true },
      ];
      expect(p.selectedCount).toBe(0);
      expect(p.shareLabel).toBe('Elige una mascota');
      p.toggle(p.own[1]);
      expect(p.selectedCount).toBe(0);
      p.toggle(p.own[0]);
      expect(p.shareLabel).toBe('Compartir 1 mascota');
    });

    it('compartir manda solo las elegidas y navega al detalle', async () => {
      const svc = { sharePets: jasmine.createSpy().and.returnValue(of({ pets: [{ petName: 'Juan' }] })) };
      const router = { navigate: jasmine.createSpy('navigate') };
      const p = new VetSharePage({} as any, router as any, svc as any, {} as any, {} as any, toastStub);
      p.vetId = 'V1';
      p.own = [
        { id: '1', name: 'Juan', subtitle: '', selected: true, alreadyShared: false },
        { id: '2', name: 'Milor', subtitle: '', selected: false, alreadyShared: false },
      ];
      p.onShare();
      await flush();
      expect(svc.sharePets).toHaveBeenCalledWith('V1', ['1']);
      expect(router.navigate).toHaveBeenCalledWith(['/vet/detail', 'V1'], { replaceUrl: true });
    });

    it('403 PET_NOT_OWNED muestra el error y no navega', () => {
      const svc = { sharePets: () => throwError(() => err('PET_NOT_OWNED', 403)) };
      const router = { navigate: jasmine.createSpy('navigate') };
      const p = new VetSharePage({} as any, router as any, svc as any, {} as any, {} as any, toastStub);
      p.own = [{ id: '1', name: 'Juan', subtitle: '', selected: true, alreadyShared: false }];
      p.onShare();
      expect(p.error?.title).toBe('No puedes compartir esa mascota');
      expect(router.navigate).not.toHaveBeenCalled();
      expect(p.busy).toBeFalse();
    });
  });

  describe('VetDetailPage', () => {
    const make = (svc: any) => {
      const router = { navigate: jasmine.createSpy('navigate') };
      const page = new VetDetailPage({} as any, router as any, svc, {} as any, toastStub);
      page.vetId = 'V1';
      page.vet = { veterinaryId: 'V1', name: 'Patitas', logoUrl: null, city: '', phone: '', status: 'ACTIVE', linkedAt: '', sharedPetsCount: 0 };
      page.pets = [{ id: '1', name: 'Juan', shared: true, grantedAt: '2026-03-03T15:02:00', busy: false }, { id: '2', name: 'Milor', shared: false, grantedAt: '', busy: false }];
      return { page, router };
    };

    it('apagar el interruptor revoca esa mascota', () => {
      const svc = { revokePet: jasmine.createSpy().and.returnValue(of({})), sharePets: jasmine.createSpy() };
      const { page } = make(svc);
      page.togglePet(page.pets[0]);
      expect(svc.revokePet).toHaveBeenCalledWith('V1', '1');
      expect(page.pets[0].shared).toBeFalse();
      expect(page.pets[0].busy).toBeFalse();
    });

    it('encender el interruptor comparte esa mascota', () => {
      const svc = { sharePets: jasmine.createSpy().and.returnValue(of({})), revokePet: jasmine.createSpy() };
      const { page } = make(svc);
      page.togglePet(page.pets[1]);
      expect(svc.sharePets).toHaveBeenCalledWith('V1', ['2']);
      expect(page.pets[1].shared).toBeTrue();
    });

    it('si el backend rechaza, el interruptor vuelve a su estado y se muestra el error', () => {
      const svc = { revokePet: () => throwError(() => err('PET_NOT_OWNED', 403)), sharePets: () => throwError(() => err('NETWORK', 0)) };
      const { page } = make(svc);
      page.togglePet(page.pets[0]);
      expect(page.pets[0].shared).toBeTrue();
      expect(page.error).not.toBeNull();
      page.togglePet(page.pets[1]);
      expect(page.pets[1].shared).toBeFalse();
      expect(page.error?.title).toBe('No pudimos conectar');
    });

    it('desvincularme llama al backend y vuelve a Mis veterinarias', async () => {
      const svc = { unlink: jasmine.createSpy().and.returnValue(of({ revokedPetsCount: 1 })) };
      const { page, router } = make(svc);
      page.openUnlink();
      expect(page.unlinkOpen).toBeTrue();
      expect(page.sharedNames).toBe('Juan');
      page.confirmUnlink();
      await flush();
      expect(svc.unlink).toHaveBeenCalledWith('V1');
      expect(router.navigate).toHaveBeenCalledWith(['/vet'], { replaceUrl: true });
    });

    it('si desvincularme falla, la hoja se cierra y queda el error', () => {
      const svc = { unlink: () => throwError(() => err('NETWORK', 0)) };
      const { page, router } = make(svc);
      page.openUnlink();
      page.confirmUnlink();
      expect(page.unlinkOpen).toBeFalse();
      expect(page.error?.title).toBe('No pudimos conectar');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
