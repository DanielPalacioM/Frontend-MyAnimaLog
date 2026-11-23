import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { defer, of, throwError } from 'rxjs';
import { Appointment, AppointmentError } from 'src/app/models/appointment.model';
import { AppointmentService } from 'src/app/services/AppointmentService/appointment';
import {
  addDaysKey, appointmentErrorText, canCancel, dateKey, fallbackDay, firstBookableDay, isAppointmentNotification,
  monthRanges, parseAppointmentError, slotBookable, slotIso, splitAppointments, weekdayOf, whyNotCancellable,
} from 'src/app/shared/utils/appointment.util';
import { VetAppointmentsPage } from './vet-appointments/vet-appointments.page';
import { VetBookPage } from './vet-book/vet-book.page';

const HOUR = 3_600_000;
const NOW = new Date('2026-12-02T15:00:00Z').getTime(); // miércoles 10:00 en Bogotá

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a1', veterinaryId: 'v1', clinicName: 'Patitas', clinicLogoUrl: null, address: '', petId: 'p1', petName: 'Toby',
  serviceId: 's1', serviceName: 'Vacunación', durationMinutes: 30, price: 35000, employeeName: '',
  startsAt: new Date(NOW + 48 * HOUR).toISOString(), endsAt: new Date(NOW + 48.5 * HOUR).toISOString(),
  status: 'CONFIRMED', origin: 'APP', notes: '', cancellationReason: '', cancelledBy: '', cancellableUntil: null, ...over,
});

describe('appointment.util', () => {
  it('slotIso usa hora de Bogotá (-05:00) sin importar la zona del dispositivo', () => {
    expect(slotIso('2026-12-07', '09:30')).toBe('2026-12-07T14:30:00.000Z');
    expect(dateKey('2026-12-07T03:00:00Z')).toBe('2026-12-06'); // 22:00 del día anterior en Bogotá
  });

  it('addDaysKey y weekdayOf', () => {
    expect(addDaysKey('2026-12-30', 3)).toBe('2027-01-02');
    expect(weekdayOf('2026-12-06')).toBe(0); // domingo
    expect(weekdayOf('2026-12-07')).toBe(1); // lunes
  });

  describe('cuadrícula de horas (mientras no exista availability)', () => {
    it('domingo cerrado', () => {
      expect(fallbackDay('2026-12-06', 30)).toEqual({ date: '2026-12-06', slots: [], closed: true });
    });

    it('lunes a viernes de 8 a 12 y de 2 a 6, cada 30 min; sábado solo la mañana', () => {
      const mon = fallbackDay('2026-12-07', 30);
      expect(mon.slots.length).toBe(16); // 8 + 8
      expect(mon.slots[0].startsAt).toBe(slotIso('2026-12-07', '08:00'));
      expect(mon.slots[8].startsAt).toBe(slotIso('2026-12-07', '14:00'));
      expect(fallbackDay('2026-12-12', 30).slots.length).toBe(8);
    });

    it('un servicio de 60 min no deja empezar a las 11:30 (terminaría después de cerrar el tramo)', () => {
      const starts = fallbackDay('2026-12-07', 60).slots.map(s => s.startsAt);
      expect(starts).toContain(slotIso('2026-12-07', '11:00'));
      expect(starts).not.toContain(slotIso('2026-12-07', '11:30'));
    });
  });

  it('slotBookable exige 1 hora de anticipación', () => {
    const slot = (t: number) => ({ startsAt: new Date(t).toISOString(), endsAt: '', employeeId: '', employeeName: '' });
    expect(slotBookable(slot(NOW + 30 * 60_000), NOW)).toBeFalse();
    expect(slotBookable(slot(NOW + HOUR), NOW)).toBeTrue();
    expect(slotBookable(slot(NOW - HOUR), NOW)).toBeFalse();
  });

  it('firstBookableDay salta los días cerrados o ya pasados', () => {
    const days = [fallbackDay('2026-12-06', 30), fallbackDay('2026-12-07', 30)];
    expect(firstBookableDay(days, new Date('2026-12-06T15:00:00Z').getTime())).toBe('2026-12-07');
  });

  describe('plazo de cancelación', () => {
    it('con más de 24 h se puede; con menos, no, y explica por qué', () => {
      expect(canCancel(appt(), NOW)).toBeTrue();
      const soon = appt({ startsAt: new Date(NOW + 5 * HOUR).toISOString() });
      expect(canCancel(soon, NOW)).toBeFalse();
      expect(whyNotCancellable(soon, NOW)).toContain('plazo');
    });

    it('respeta cancellableUntil si el backend lo manda', () => {
      const a = appt({ startsAt: new Date(NOW + 5 * HOUR).toISOString(), cancellableUntil: new Date(NOW + 2 * HOUR).toISOString() });
      expect(canCancel(a, NOW)).toBeTrue();
    });

    it('una cita ya cerrada no se puede cancelar ni tiene explicación', () => {
      const done = appt({ status: 'COMPLETED' });
      expect(canCancel(done, NOW)).toBeFalse();
      expect(whyNotCancellable(done, NOW)).toBe('');
      expect(canCancel(appt({ status: 'CHECKED_IN' }), NOW)).toBeFalse();
    });
  });

  it('splitAppointments separa próximas (la más cercana primero) y anteriores (la más reciente primero)', () => {
    const list = [
      appt({ id: 'far', startsAt: new Date(NOW + 72 * HOUR).toISOString(), endsAt: new Date(NOW + 73 * HOUR).toISOString() }),
      appt({ id: 'near' }),
      appt({ id: 'old', status: 'COMPLETED', startsAt: new Date(NOW - 72 * HOUR).toISOString(), endsAt: new Date(NOW - 71 * HOUR).toISOString() }),
      appt({ id: 'cancelled', status: 'CANCELLED' }),
    ];
    const { upcoming, past } = splitAppointments(list, NOW);
    expect(upcoming.map(a => a.id)).toEqual(['near', 'far']);
    expect(past.map(a => a.id)).toEqual(['cancelled', 'old']);
  });

  it('monthRanges parte en tramos de 30 días como máximo', () => {
    const r = monthRanges(NOW, 30, 60);
    expect(r.length).toBe(3);
    r.forEach(x => expect(new Date(x.to).getTime() - new Date(x.from).getTime()).toBeLessThanOrEqual(30 * 24 * HOUR));
    expect(r[1].from).toBe(r[0].to);
  });

  it('errores: código conocido, red y servicio caído', () => {
    expect(parseAppointmentError({ status: 409, error: { code: 'SLOT_UNAVAILABLE' } }).code).toBe('SLOT_UNAVAILABLE');
    expect(parseAppointmentError({ status: 0 }).code).toBe('NETWORK');
    expect(parseAppointmentError({ status: 503 }).code).toBe('UNAVAILABLE');
    expect(parseAppointmentError({ status: 418, error: { code: 'RARO' } }).code).toBe('UNKNOWN');
    expect(appointmentErrorText({ code: 'SLOT_TAKEN', status: 409, message: '' }).title).toContain('ya no está libre');
  });

  it('las notificaciones APPOINTMENT_* abren Mis citas', () => {
    expect(isAppointmentNotification('APPOINTMENT_CONFIRMED')).toBeTrue();
    expect(isAppointmentNotification('VACCINE_DUE')).toBeFalse();
  });
});

describe('AppointmentService', () => {
  let svc: AppointmentService;
  let http: HttpTestingController;
  const base = 'https://pets-api-gateway-20369076707.us-central1.run.app/api';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(AppointmentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('servicios reservables: acepta { services } y snake_case', () => {
    let out: any[] = [];
    svc.getServices('v1').subscribe(r => (out = r));
    http.expectOne(`${base}/veterinaries/v1/services`).flush({ services: [{ id: 's1', name: 'Vacunación', duration_minutes: 15, price: 35000 }] });
    expect(out).toEqual([{ id: 's1', name: 'Vacunación', durationMinutes: 15, price: 35000 }]);
  });

  it('pedir cita: manda solo serviceId, petId, startsAt y la nota si la hay, y normaliza la respuesta', () => {
    let out: Appointment | undefined;
    svc.request('v1', { serviceId: 's1', petId: 'p1', startsAt: '2026-12-07T15:00:00.000Z', notes: '  ' }).subscribe(r => (out = r));
    const req = http.expectOne(`${base}/veterinaries/v1/appointment-requests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ serviceId: 's1', petId: 'p1', startsAt: '2026-12-07T15:00:00.000Z' });
    req.flush({ id: 'a1', status: 'REQUESTED', origin: 'APP', employeeId: 'e1', petName: 'Toby', startsAt: '2026-12-07T15:00:00.000Z', endsAt: '2026-12-07T15:30:00.000Z' });
    expect(out).toEqual(jasmine.objectContaining({ id: 'a1', veterinaryId: 'v1', status: 'REQUESTED', petName: 'Toby', durationMinutes: 30 }));
  });

  it('pedir cita con nota la incluye', () => {
    svc.request('v1', { serviceId: 's1', petId: 'p1', startsAt: 'x', notes: ' Se lame la herida ' }).subscribe();
    const req = http.expectOne(`${base}/veterinaries/v1/appointment-requests`);
    expect(req.request.body.notes).toBe('Se lame la herida');
    req.flush({});
  });

  it('un 409 SLOT_UNAVAILABLE sale como AppointmentError', () => {
    let err: AppointmentError | undefined;
    svc.request('v1', { serviceId: 's1', petId: 'p1', startsAt: 'x' }).subscribe({ error: e => (err = e) });
    http.expectOne(`${base}/veterinaries/v1/appointment-requests`).flush({ code: 'SLOT_UNAVAILABLE' }, { status: 409, statusText: 'Conflict' });
    expect(err?.code).toBe('SLOT_UNAVAILABLE');
  });

  it('disponibilidad: si el servidor responde 404 usa la cuadrícula local y lo marca', () => {
    let out: any;
    svc.getAvailability('v1', 's1', 30, '2026-12-07', 2).subscribe(r => (out = r));
    http.expectOne(r => r.url === `${base}/veterinaries/v1/availability`).flush('no', { status: 404, statusText: 'Not Found' });
    expect(out.source).toBe('grid');
    expect(out.days.length).toBe(2);
    expect(out.days[0].slots.length).toBe(16);
  });

  it('disponibilidad: acepta { days } y una lista plana de franjas', () => {
    let a: any; let b: any;
    svc.getAvailability('v1', 's1', 30, '2026-12-07', 2).subscribe(r => (a = r));
    http.expectOne(r => r.url.endsWith('/availability')).flush({
      days: [{ date: '2026-12-07', slots: [{ startsAt: '2026-12-07T14:00:00Z', endsAt: '2026-12-07T14:30:00Z', employeeId: 'e1', employeeName: 'Dra. Ruiz' }] }, { date: '2026-12-08', slots: [] }],
    });
    expect(a.source).toBe('server');
    expect(a.days[0].slots[0].employeeName).toBe('Dra. Ruiz');
    expect(a.days[1].closed).toBeTrue();

    svc.getAvailability('v1', 's1', 30, '2026-12-07', 2).subscribe(r => (b = r));
    http.expectOne(r => r.url.endsWith('/availability')).flush([{ startsAt: '2026-12-07T14:00:00Z', endsAt: '2026-12-07T14:30:00Z', employeeId: 'e1' }]);
    expect(b.days[0].slots.length).toBe(1);
    expect(b.days[1].slots.length).toBe(0);
  });

  it('mis citas: pide de a 30 días y junta sin repetir', () => {
    let out: Appointment[] = [];
    svc.getMine(NOW).subscribe(r => (out = r));
    const reqs = http.match(r => r.url === `${base}/me/appointments`);
    expect(reqs.length).toBe(3);
    reqs[0].flush({ appointments: [{ id: 'a1', status: 'CONFIRMED', clinicName: 'Patitas', startsAt: 'x' }] });
    reqs[1].flush({ appointments: [{ id: 'a1', status: 'CONFIRMED', clinicName: 'Patitas', startsAt: 'x' }, { id: 'a2', status: 'REQUESTED', startsAt: 'y' }] });
    reqs[2].flush({ appointments: [] });
    expect(out.map(a => a.id).sort()).toEqual(['a1', 'a2']);
    expect(out.find(a => a.id === 'a1')?.clinicName).toBe('Patitas');
  });

  it('cancelar y reprogramar usan PATCH con motivo / nueva hora', () => {
    svc.cancel('v1', 'a1', ' Ya no puedo ').subscribe();
    const c = http.expectOne(`${base}/veterinaries/v1/appointments/a1/cancel`);
    expect(c.request.method).toBe('PATCH');
    expect(c.request.body).toEqual({ reason: 'Ya no puedo' });
    c.flush({ id: 'a1', status: 'CANCELLED', cancelledBy: 'OWNER' });

    svc.reschedule('v1', 'a1', '2026-12-07T16:00:00.000Z').subscribe();
    const r = http.expectOne(`${base}/veterinaries/v1/appointments/a1/reschedule`);
    expect(r.request.body).toEqual({ startsAt: '2026-12-07T16:00:00.000Z' });
    r.flush({});
  });
});

describe('VetBookPage', () => {
  const vet = { veterinaryId: 'v1', name: 'Patitas', logoUrl: null, city: '', phone: '', status: 'ACTIVE', linkedAt: '', sharedPetsCount: 0 };
  const route = (query: Record<string, string> = {}) =>
    ({ snapshot: { paramMap: { get: () => 'v1' }, queryParamMap: { get: (k: string) => query[k] ?? null } } }) as any;

  function build(opts: { shared?: boolean; request?: any; query?: Record<string, string>; mine?: Appointment[] } = {}) {
    const calls: string[] = [];
    const appointments: any = {
      getServices: () => of([{ id: 's1', name: 'Vacunación', durationMinutes: 30, price: 35000 }]),
      getMine: () => of(opts.mine ?? []),
      getAvailability: (_v: string, _s: string, _d: number, from: string) => of({ days: [fallbackDay(from, 30)], source: 'grid' }),
      request: (...a: any[]) => defer(() => opts.request ? opts.request(...a) : (calls.push('request'), of(appt({ status: 'REQUESTED' })))),
      reschedule: () => defer(() => { calls.push('reschedule'); return of(appt()); }),
    };
    const vets: any = {
      getLinked: () => of([vet]),
      loadSharing: () => of(new Map(opts.shared ? [['v1', [{ id: 'p1', name: 'Toby' }]]] : [])),
      sharePets: () => defer(() => { calls.push('share'); return of({}); }),
    };
    const pets: any = { getPets: () => of([{ id: 'p1', name: 'Toby', species: 'Perro', breed: '', ageMonths: 24 }, { id: 'p2', name: 'Ajena', inCare: true }]) };
    const page = new VetBookPage(route(opts.query), { navigate: () => Promise.resolve(true) } as any, appointments, vets, pets);
    return { page, calls };
  }

  it('carga la clínica, los servicios y solo las mascotas propias; con una sola, la deja elegida', () => {
    const { page } = build();
    page.ionViewWillEnter();
    expect(page.loading).toBeFalse();
    expect(page.services.length).toBe(1);
    expect(page.pets.map(p => p.name)).toEqual(['Toby']);
    expect(page.petId).toBe('p1');
  });

  it('elegir servicio pasa al paso 2 y trae las horas', () => {
    const { page } = build();
    page.ionViewWillEnter();
    page.pickService(page.services[0]);
    expect(page.step).toBe(2);
    expect(page.gridNote).toBeTrue();
    expect(page.strip.length).toBe(1);
  });

  it('mascota no compartida: confirmar comparte y luego pide la cita', () => {
    const { page, calls } = build({ shared: false });
    page.ionViewWillEnter();
    page.pickService(page.services[0]);
    page.dayKey = '2026-12-07';
    page.slot = { startsAt: slotIso('2026-12-07', '09:00'), endsAt: '', employeeId: '', employeeName: '' };
    page.step = 3;
    expect(page.confirmLabel).toBe('Compartir a Toby y pedir cita');
    page.confirm();
    expect(calls).toEqual(['share', 'request']);
    expect(page.result?.status).toBe('REQUESTED');
    expect(page.resultTitle).toBe('Pedido enviado');
  });

  it('mascota ya compartida: pide la cita directo', () => {
    const { page, calls } = build({ shared: true });
    page.ionViewWillEnter();
    page.slot = { startsAt: slotIso('2026-12-07', '09:00'), endsAt: '', employeeId: '', employeeName: '' };
    page.service = page.services[0];
    page.step = 3;
    expect(page.confirmLabel).toBe('Pedir cita');
    page.confirm();
    expect(calls).toEqual(['request']);
  });

  it('SLOT_UNAVAILABLE devuelve al paso 2 con el aviso y recarga las horas', () => {
    const { page } = build({ shared: true, request: () => throwError(() => ({ code: 'SLOT_UNAVAILABLE', status: 409, message: '' })) });
    page.ionViewWillEnter();
    page.pickService(page.services[0]);
    page.slot = { startsAt: slotIso('2026-12-07', '09:00'), endsAt: '', employeeId: '', employeeName: '' };
    page.step = 3;
    page.confirm();
    expect(page.step as number).toBe(2);
    expect(page.error?.title).toContain('ya no está libre');
    expect(page.slot).toBeNull();
    expect(page.submitting).toBeFalse();
  });

  it('PET_NOT_SHARED con la mascota marcada como compartida: comparte y reintenta una vez', () => {
    let n = 0;
    const { page, calls } = build({
      shared: true,
      request: () => { n++; return n === 1 ? throwError(() => ({ code: 'PET_NOT_SHARED', status: 409, message: '' })) : of(appt({ status: 'CONFIRMED' })); },
    });
    page.ionViewWillEnter();
    page.slot = { startsAt: slotIso('2026-12-07', '09:00'), endsAt: '', employeeId: '', employeeName: '' };
    page.service = page.services[0];
    page.confirm();
    expect(calls).toEqual(['share']);
    expect(n).toBe(2);
    expect(page.resultTitle).toBe('¡Cita confirmada!');
  });

  it('reprogramar: salta al paso 2 con el servicio de la cita y confirma con reschedule', () => {
    const moving = appt({ id: 'a9' });
    const { page, calls } = build({ query: { appointmentId: 'a9' }, mine: [moving] });
    page.ionViewWillEnter();
    expect(page.rescheduling).toBeTrue();
    expect(page.step).toBe(2);
    expect(page.service?.id).toBe('s1');
    page.slot = { startsAt: slotIso('2026-12-07', '09:00'), endsAt: '', employeeId: '', employeeName: '' };
    page.continueFromSlots();
    expect(calls).toEqual(['reschedule']);
    expect(page.resultTitle).toBe('Cita reprogramada');
  });

  it('reprogramar una cita que no existe muestra el aviso', () => {
    const { page } = build({ query: { appointmentId: 'zzz' }, mine: [] });
    page.ionViewWillEnter();
    expect(page.loadError?.title).toBe('No encontramos esa cita');
  });
});

describe('VetAppointmentsPage', () => {
  const make = (list: Appointment[], cancel?: any) => {
    const svc: any = { getMine: () => of(list), cancel: cancel ?? (() => of(appt({ status: 'CANCELLED' }))) };
    const route: any = { snapshot: { queryParamMap: { get: (k: string) => (k === 'veterinaryId' ? 'v1' : null) } } };
    const nav: any[][] = [];
    const router: any = { navigate: (...a: any[]) => { nav.push(a); return Promise.resolve(true); } };
    const toast: any = { create: () => Promise.resolve({ present: () => Promise.resolve() }) };
    return { page: new VetAppointmentsPage(route, router, svc, toast), nav };
  };

  it('filtra por clínica y separa próximas y anteriores', () => {
    const { page } = make([appt({ id: 'a' }), appt({ id: 'b', veterinaryId: 'otra' }), appt({ id: 'c', status: 'CANCELLED' })]);
    page.ionViewWillEnter();
    expect(page.state).toBe('ready');
    expect(page.upcoming.map(a => a.id)).toEqual(['a']);
    expect(page.past.map(a => a.id)).toEqual(['c']);
  });

  it('un error de carga muestra el estado de error', () => {
    const svc: any = { getMine: () => throwError(() => ({ code: 'NETWORK', status: 0, message: '' })) };
    const page = new VetAppointmentsPage({ snapshot: { queryParamMap: { get: () => null } } } as any, {} as any, svc, {} as any);
    page.ionViewWillEnter();
    expect(page.state).toBe('error');
    expect(page.error?.title).toBe('No pudimos conectar');
  });

  it('textos de apoyo: rechazada con motivo, cancelada por la clínica, pendiente', () => {
    const { page } = make([]);
    expect(page.detail(appt({ status: 'REJECTED', cancellationReason: 'Sin agenda' }))).toContain('Sin agenda');
    expect(page.detail(appt({ status: 'CANCELLED', cancelledBy: 'CLINIC' }))).toContain('La clínica la canceló');
    expect(page.detail(appt({ status: 'CANCELLED', cancelledBy: 'OWNER', cancellationReason: 'Viaje' }))).toBe('La cancelaste: Viaje');
    expect(page.detail(appt({ status: 'REQUESTED' }))).toContain('confirmarla');
  });

  it('cancelar con éxito cierra la hoja y recarga', async () => {
    const { page } = make([appt()]);
    page.ionViewWillEnter();
    page.openCancel(page.upcoming[0]);
    page.reason = 'Ya no puedo';
    page.confirmCancel();
    await new Promise(r => setTimeout(r));
    expect(page.cancelling).toBeNull();
    expect(page.busy).toBeFalse();
  });

  it('cancelar fuera de plazo muestra el error y deja la hoja abierta', () => {
    const { page } = make([appt()], () => throwError(() => ({ code: 'CANCELLATION_WINDOW_CLOSED', status: 409, message: '' })));
    page.ionViewWillEnter();
    page.openCancel(page.upcoming[0]);
    page.confirmCancel();
    expect(page.actionError?.title).toBe('Ya pasó el plazo');
    expect(page.cancelling).not.toBeNull();
  });

  it('reprogramar navega a la pantalla de pedir cita con el id de la cita', () => {
    const { page, nav } = make([appt({ id: 'a7' })]);
    page.reschedule(appt({ id: 'a7' }));
    expect(nav[0] as any).toEqual([['/vet/book', 'v1'], { queryParams: { appointmentId: 'a7' } }]);
  });
});
