import { of } from 'rxjs';
import { Appointment } from 'src/app/models/appointment.model';
import { confirmedForPet } from 'src/app/shared/utils/appointment.util';
import { VetLinkPage } from './vet-link/vet-link.page';

const toastStub = { create: () => Promise.resolve({ present: () => Promise.resolve() }) } as any;
const flush = () => new Promise(r => setTimeout(r));

describe('Pedir cita sin estar vinculado (desde la asociación)', () => {
  const preview = { veterinaryId: 'vet-1', name: 'Clínica Patitas', logoUrl: null, city: '', department: '', address: '', alreadyLinked: false };
  const make = (alreadyLinked = false) => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const svc = { link: jasmine.createSpy('link').and.returnValue(of({ id: 'l', veterinaryId: 'vet-1', veterinaryName: 'Clínica Patitas', logoUrl: null, linkedAt: '', alreadyLinked })) };
    const page = new VetLinkPage(router as any, { snapshot: { queryParamMap: { get: () => null } } } as any, svc as any, toastStub);
    page.code = 'VET-7K2M9QXA';
    page.preview = { ...preview, alreadyLinked };
    page.step = 'preview';
    return { page, router, svc };
  };

  it('"Vincularme y pedir cita" vincula y lleva directo a Pedir cita de esa clínica', async () => {
    const { page, router, svc } = make(false);
    page.onLinkAndBook();
    await flush();
    expect(svc.link).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/vet/book', 'vet-1'], { replaceUrl: true });
  });

  it('si ya estaba vinculado, va directo a Pedir cita', async () => {
    const { page, router } = make(true);
    page.onLinkAndBook();
    await flush();
    expect(router.navigate).toHaveBeenCalledWith(['/vet/book', 'vet-1'], { replaceUrl: true });
  });

  it('"Vincularme" sin cita sigue llevando a compartir mascotas', async () => {
    const { page, router } = make(false);
    page.onLink();
    await flush();
    expect(router.navigate).toHaveBeenCalledWith(['/vet/share', 'vet-1'], { queryParams: { welcome: 1 }, replaceUrl: true });
  });
});

describe('Citas en el calendario de la mascota', () => {
  const appt = (id: string, petId: string, status: Appointment['status']) => ({ id, petId, status } as Appointment);

  it('solo entran las de esa mascota que la clínica ya validó (confirmada o en la clínica)', () => {
    const list = [
      appt('a', 'luna', 'REQUESTED'),
      appt('b', 'luna', 'CONFIRMED'),
      appt('c', 'luna', 'CHECKED_IN'),
      appt('d', 'luna', 'REJECTED'),
      appt('e', 'luna', 'CANCELLED'),
      appt('f', 'thor', 'CONFIRMED'),
    ];
    expect(confirmedForPet(list, 'luna').map(a => a.id)).toEqual(['b', 'c']);
  });

  it('sin citas no falla', () => {
    expect(confirmedForPet([], 'luna')).toEqual([]);
  });
});
