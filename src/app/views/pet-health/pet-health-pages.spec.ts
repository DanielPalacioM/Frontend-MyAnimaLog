import { of, throwError } from 'rxjs';
import { HealthError } from 'src/app/models/pet-health.model';
import {
  normalizeAllergies,
  normalizeDewormings,
  normalizeNeutered,
  todayIso,
} from 'src/app/shared/utils/pet-health.util';
import { HealthPage } from './health/health.page';
import { DewormingPage } from './deworming/deworming.page';
import { RegisterDewormingPage } from './register-deworming/register-deworming.page';

const PET = 'pet-1';
const herr = (code: HealthError['code'], status = 400): HealthError => ({ code, status, message: '' });
const route = (query: Record<string, string> = {}) => ({
  snapshot: { paramMap: { get: () => PET }, queryParamMap: { get: (k: string) => query[k] ?? null } },
}) as any;
const pet = (over: any = {}) => ({ id: PET, ownerId: 'u-1', name: 'Luna', species: 'Perro', birthDate: '2022-01-15', weight: 4.2, imageUrl: null, ...over });
const addDays = (n: number): string => { const d = new Date(); d.setDate(d.getDate() + n); return todayIso(d); };

describe('Pantallas de salud de la mascota', () => {
  describe('HealthPage (esterilización y alergias)', () => {
    let health: any;
    const allergies = normalizeAllergies({
      allergyStatus: 'HAS_ALLERGIES',
      allergies: [
        { id: 'a1', allergen: 'Penicilina', category: 'DRUG', severity: 'SEVERE', status: 'SUSPECTED', source: 'OWNER' },
        { id: 'a2', allergen: 'Pollo', category: 'FOOD', severity: 'MILD', status: 'CONFIRMED', source: 'CLINIC', veterinaryName: 'Patitas' },
        { id: 'a3', allergen: 'Polen', category: 'ENVIRONMENT', severity: 'MILD', status: 'RESOLVED', source: 'OWNER' },
        { id: 'a4', allergen: 'Error', category: 'OTHER', severity: 'MILD', status: 'ENTERED_IN_ERROR', source: 'OWNER' },
      ],
    });

    const make = (canEdit = true) => {
      health = {
        loadAccess: jasmine.createSpy('loadAccess').and.returnValue(of({ pet: pet(), role: canEdit ? 'OWNER' : 'VIEWER', canEdit })),
        getSummary: jasmine.createSpy('getSummary').and.returnValue(of({ neutered: normalizeNeutered({ status: 'YES', at: '2024-03-01', source: 'OWNER' }) })),
        getAllergies: jasmine.createSpy('getAllergies').and.returnValue(of(allergies)),
        addAllergy: jasmine.createSpy('addAllergy').and.returnValue(of({})),
        changeAllergyState: jasmine.createSpy('changeAllergyState').and.returnValue(of({})),
        setAllergyStatus: jasmine.createSpy('setAllergyStatus').and.returnValue(of({})),
        setNeutered: jasmine.createSpy('setNeutered').and.callFake((_: string, status: string, at?: string) => of(normalizeNeutered({ status, at, source: 'OWNER' }))),
      };
      const p = new HealthPage(route(), health);
      p.ngOnInit();
      return p;
    };

    it('carga la mascota, la esterilización y las alergias; separa vigentes, resueltas y las ingresadas por error', () => {
      const p = make();
      expect(p.loading).toBeFalse();
      expect(p.pet?.name).toBe('Luna');
      expect(p.neutered?.status).toBe('YES');
      expect(p.active.map(a => a.allergen)).toEqual(['Penicilina', 'Pollo']);
      expect(p.past.map(a => a.allergen)).toEqual(['Polen']);
      expect(p.hasSevere).toBeTrue();
    });

    it('el dueño retira las suyas; las de la clínica y el rol VIEWER no', () => {
      const owner = make(true);
      expect(owner.canChange(owner.active[0])).toBeTrue();
      expect(owner.canChange(owner.active[1])).toBeFalse();
      const viewer = make(false);
      expect(viewer.canChange(viewer.active[0])).toBeFalse();
    });

    it('si el backend todavía no publica las rutas lo dice, sin romper la pantalla', () => {
      const p = make();
      health.getAllergies.and.returnValue(throwError(() => herr('NOT_AVAILABLE', 404)));
      p.loadHealth();
      expect(p.unavailable).toBeTrue();
      expect(p.failedText).toContain('todavía no está disponible');
    });

    it('agregar alergia pide el nombre y manda los datos recortados', () => {
      const p = make();
      p.openAdd();
      p.form.allergen = '   ';
      p.saveAllergy();
      expect(p.formError).toContain('alérgica');
      expect(health.addAllergy).not.toHaveBeenCalled();

      p.form = { allergen: '  Penicilina ', category: 'DRUG', severity: 'SEVERE', reaction: ' Urticaria ' };
      health.getAllergies.calls.reset();
      p.saveAllergy();
      expect(health.addAllergy).toHaveBeenCalledWith({ petId: PET, allergen: 'Penicilina', category: 'DRUG', severity: 'SEVERE', reaction: 'Urticaria' });
      expect(p.addOpen).toBeFalse();
      expect(p.notice).toContain('Un veterinario podrá confirmarla');
      expect(health.getAllergies).toHaveBeenCalled(); // recarga para mostrar lo que quedó guardado
    });

    it('un error al guardar la alergia se muestra y la hoja sigue abierta', () => {
      const p = make();
      health.addAllergy.and.returnValue(throwError(() => herr('PET_NOT_OWNED', 403)));
      p.openAdd();
      p.form.allergen = 'Pollo';
      p.saveAllergy();
      expect(p.addOpen).toBeTrue();
      expect(p.formError).toContain('permiso');
      expect(p.saving).toBeFalse();
    });

    it('"No tiene alergias conocidas" se guarda; con alergias vigentes el backend responde 409 y se explica', () => {
      const p = make();
      p.markNoneKnown();
      expect(health.setAllergyStatus).toHaveBeenCalledWith(PET, 'NONE_KNOWN');
      expect(p.allergies?.allergyStatus).toBe('NONE_KNOWN');
      health.setAllergyStatus.and.returnValue(throwError(() => herr('ACTIVE_ALLERGIES_EXIST', 409)));
      p.markUnknown();
      expect(p.statusError).toContain('alergias vigentes');
    });

    it('resolver o marcar por error exige un motivo, y no se borra', () => {
      const p = make();
      p.askChange(p.active[0], 'RESOLVED');
      p.reason = '  ';
      p.confirmChange();
      expect(p.changeError).toContain('motivo');
      expect(health.changeAllergyState).not.toHaveBeenCalled();

      p.reason = ' Lo descartó el veterinario ';
      p.confirmChange();
      expect(health.changeAllergyState).toHaveBeenCalledWith('a1', 'RESOLVED', 'Lo descartó el veterinario');
      expect(p.changing).toBeNull();
      expect(p.notice).toContain('resuelta');
    });

    it('esterilización: Sí con fecha, No y No sé (sin fecha)', () => {
      const p = make();
      p.openNeutered();
      expect(p.nStatus).toBe('YES');
      expect(p.nDate).toBe('2024-03-01');
      p.pickNeutered('NO');
      expect(p.nDate).toBe('');
      p.saveNeutered();
      expect(health.setNeutered).toHaveBeenCalledWith(PET, 'NO', undefined);
      expect(p.neutered?.status).toBe('NO');
      expect(p.neuteredOpen).toBeFalse();

      p.openNeutered();
      p.pickNeutered('UNKNOWN');
      p.saveNeutered();
      expect(p.neutered?.status).toBe('UNKNOWN');
      expect(p.neuteredText).toBe('Sin confirmar');
    });

    it('esterilización: no acepta una fecha futura ni anterior al nacimiento', () => {
      const p = make();
      p.openNeutered();
      p.pickNeutered('YES');
      p.nDate = addDays(5);
      p.saveNeutered();
      expect(p.nError).toContain('futura');
      p.nDate = '2020-01-01'; // nació el 2022-01-15
      p.saveNeutered();
      expect(p.nError).toContain('anterior al nacimiento');
      expect(health.setNeutered).not.toHaveBeenCalled();
    });

    it('la fecha de la esterilización viaja solo con "Sí"', () => {
      const p = make();
      p.openNeutered();
      p.pickNeutered('YES');
      p.nDate = '2024-03-01';
      p.saveNeutered();
      expect(health.setNeutered).toHaveBeenCalledWith(PET, 'YES', '2024-03-01');
    });
  });

  describe('DewormingPage', () => {
    let health: any;
    let router: any;
    const overview = (over: any = {}) => normalizeDewormings({
      dewormings: {
        INTERNAL: { registered: true, lastApplicationDate: addDays(-20), id: 'd1', product: 'Drontal', dose: '1 tableta' },
        EXTERNAL: { registered: false },
        ...over,
      },
    });

    const make = (canEdit = true, ov = overview()) => {
      health = {
        loadAccess: jasmine.createSpy('loadAccess').and.returnValue(of({ pet: pet(), role: 'OWNER', canEdit })),
        getDewormings: jasmine.createSpy('getDewormings').and.returnValue(of(ov)),
        voidDeworming: jasmine.createSpy('voidDeworming').and.returnValue(of({})),
      };
      router = { navigate: jasmine.createSpy('navigate') };
      const p = new DewormingPage(route(), router, health);
      p.ngOnInit();
      return p;
    };

    it('muestra el estado por tipo y propone la próxima dosis según la edad cuando el backend no la manda', () => {
      const p = make();
      expect(p.status('INTERNAL')?.nextSuggested).toBeTrue();
      expect(p.status('INTERNAL')?.nextDoseDate).toBe(addDays(-20 + 90)); // adulto: cada 3 meses
      expect(p.status('INTERNAL')?.state).toBe('OK');
      expect(p.status('EXTERNAL')?.state).toBe('NONE');
      expect(p.anyRegistered).toBeTrue();
    });

    it('una dosis que ya tocaba queda vencida', () => {
      const p = make(true, overview({ INTERNAL: { registered: true, lastApplicationDate: addDays(-120), id: 'd1', product: 'Drontal' } }));
      expect(p.status('INTERNAL')?.state).toBe('OVERDUE');
      expect(p.tone('OVERDUE')).toBe('bad');
      expect(p.icon('OVERDUE')).toBe('alert-circle');
    });

    it('si el backend solo manda la última dosis por tipo, el historial muestra esas', () => {
      const p = make();
      expect(p.entries.length).toBe(1);
      expect(p.entries[0].product).toBe('Drontal');
      expect(p.detail(p.entries[0])).toBe('Drontal · 1 tableta');
    });

    it('sin ninguna dosis no hay historial y se invita a registrar', () => {
      const p = make(true, normalizeDewormings({}));
      expect(p.anyRegistered).toBeFalse();
      expect(p.entries).toEqual([]);
    });

    it('anular exige motivo; la dosis anulada no se borra, se recarga la lista', () => {
      const p = make();
      p.askVoid(p.entries[0]);
      p.reason = '';
      p.confirmVoid();
      expect(p.voidError).toContain('motivo');
      expect(health.voidDeworming).not.toHaveBeenCalled();
      p.reason = 'Me equivoqué de fecha';
      health.getDewormings.calls.reset();
      p.confirmVoid();
      expect(health.voidDeworming).toHaveBeenCalledWith('d1', 'Me equivoqué de fecha');
      expect(p.voiding).toBeNull();
      expect(health.getDewormings).toHaveBeenCalled();
    });

    it('solo se anulan las dosis propias, y solo con permiso de edición', () => {
      const clinic = normalizeDewormings([{ id: 'c1', kind: 'EXTERNAL', product: 'Frontline', applicationDate: addDays(-5), administeredBy: 'CLINIC', veterinaryName: 'Patitas' }]);
      const p = make(true, clinic);
      expect(p.canVoid(p.entries[0])).toBeFalse();
      expect(p.who(p.entries[0])).toBe('Aplicada por Patitas');
      const own = make();
      expect(own.canVoid(own.entries[0])).toBeTrue();
      expect(own.who(own.entries[0])).toBe('Registrada por ti');
      const viewer = make(false);
      expect(viewer.canVoid(viewer.entries[0])).toBeFalse();
    });

    it('el rol VIEWER no puede registrar', () => {
      expect(make(false).canEdit).toBeFalse();
    });

    it('registrar va a la pantalla de registro con el tipo elegido', () => {
      const p = make();
      p.register('EXTERNAL');
      expect(router.navigate).toHaveBeenCalledWith(['/pet-health', PET, 'deworming', 'new'], { queryParams: { kind: 'EXTERNAL' } });
      p.register();
      expect(router.navigate).toHaveBeenCalledWith(['/pet-health', PET, 'deworming', 'new'], {});
    });

    it('si el backend todavía no publica la ruta lo dice', () => {
      const p = make();
      health.getDewormings.and.returnValue(throwError(() => herr('NOT_AVAILABLE', 404)));
      p.loadOverview();
      expect(p.unavailable).toBeTrue();
    });
  });

  describe('RegisterDewormingPage', () => {
    let health: any;
    let router: any;

    const make = (query: Record<string, string> = {}, petOver: any = {}, canEdit = true) => {
      health = {
        loadAccess: jasmine.createSpy('loadAccess').and.returnValue(of({ pet: pet(petOver), role: 'OWNER', canEdit })),
        addDeworming: jasmine.createSpy('addDeworming').and.returnValue(of({})),
      };
      router = { navigate: jasmine.createSpy('navigate') };
      const p = new RegisterDewormingPage(route(query), router, health);
      p.ngOnInit();
      return p;
    };

    it('abre con el tipo de la URL, el peso de la mascota y la fecha de hoy', () => {
      const p = make({ kind: 'external' });
      expect(p.kind).toBe('EXTERNAL');
      expect(p.weight).toBe('4.2');
      expect(p.appliedDate).toBe(todayIso());
    });

    it('propone la próxima dosis y la recalcula al cambiar tipo o fecha, hasta que el usuario la cambie', () => {
      const p = make(); // adulto
      expect(p.nextDose).toBe(addDays(90));
      p.pickKind('EXTERNAL');
      expect(p.nextDose).toBe(addDays(30));
      p.onDateChange(addDays(-10));
      expect(p.nextDose).toBe(addDays(20));
      p.onNextChange(addDays(60));
      p.pickKind('INTERNAL');
      expect(p.nextDose).toBe(addDays(60)); // ya no se recalcula
    });

    it('un cachorro de menos de 3 meses recibe una sugerencia de 2 semanas', () => {
      const p = make({}, { birthDate: addDays(-40) });
      expect(p.nextDose).toBe(addDays(14));
    });

    it('valida producto, fecha, peso y próxima dosis antes de enviar', () => {
      const p = make();
      p.save();
      expect(p.error).toContain('producto');
      expect(p.productInvalid).toBeTrue();
      p.product = 'Drontal';
      p.appliedDate = addDays(3);
      p.save();
      expect(p.error).toContain('futura');
      p.appliedDate = '2020-01-01'; // nació el 2022-01-15
      p.save();
      expect(p.error).toContain('anterior al nacimiento');
      p.appliedDate = todayIso();
      p.weight = 'abc';
      p.save();
      expect(p.error).toContain('peso');
      p.weight = '4,5';
      p.nextDose = addDays(-3);
      p.save();
      expect(p.error).toContain('próxima dosis');
      expect(health.addDeworming).not.toHaveBeenCalled();
    });

    it('guarda con los datos recortados y vuelve a la desparasitación', () => {
      const p = make({ kind: 'INTERNAL' });
      p.product = ' Drontal ';
      p.dose = ' 1 tableta ';
      p.weight = '4,5';
      p.notes = ' Con comida ';
      p.save();
      expect(health.addDeworming).toHaveBeenCalledWith({
        petId: PET,
        kind: 'INTERNAL',
        product: 'Drontal',
        applicationDate: todayIso(),
        dose: '1 tableta',
        weightKg: 4.5,
        nextDoseDate: addDays(90),
        notes: 'Con comida',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/pet-health', PET, 'deworming'], { replaceUrl: true });
    });

    it('los campos opcionales vacíos no se envían, y se puede quitar la próxima dosis', () => {
      const p = make();
      p.weight = '';
      p.product = 'Frontline';
      p.clearNext();
      p.save();
      const body = health.addDeworming.calls.mostRecent().args[0];
      expect('dose' in body).toBeFalse();
      expect('weightKg' in body).toBeFalse();
      expect('nextDoseDate' in body).toBeFalse();
      expect('notes' in body).toBeFalse();
    });

    it('un error del backend se muestra y no navega', () => {
      const p = make();
      health.addDeworming.and.returnValue(throwError(() => herr('VALIDATION_ERROR', 400)));
      p.product = 'Drontal';
      p.save();
      expect(p.error).toContain('Revisa los datos');
      expect(p.saving).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('con rol VIEWER no se puede registrar', () => {
      expect(make({}, {}, false).canEdit).toBeFalse();
    });
  });
});
