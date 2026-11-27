import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HealthError } from 'src/app/models/pet-health.model';
import { PetService } from 'src/app/services/PetService/pet';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';
import { PetHealthService } from './pet-health';

// Rutas y cuerpos de la carpeta D9 de la colección "Medical Pet Backend · Dueño y Veterinaria".
describe('PetHealthService', () => {
  let service: PetHealthService;
  let http: HttpTestingController;
  let petService: { getPetById: jasmine.Spy };
  let shared: { getMyRoleForPet: jasmine.Spy };
  const base = environment.apiUrl;
  const PET = 'de1c7eb4-2682-4d71-96f6-dc4a04e2ae7b';

  beforeEach(() => {
    PetHealthService.summaryMissing = false;
    petService = { getPetById: jasmine.createSpy('getPetById') };
    shared = { getMyRoleForPet: jasmine.createSpy('getMyRoleForPet') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PetService, useValue: petService },
        { provide: SharedProfileService, useValue: shared },
      ],
    });
    service = TestBed.inject(PetHealthService);
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('userId', 'u-1');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('userId');
  });

  describe('desparasitación', () => {
    it('lista con GET /dewormings?petId= y normaliza la última dosis por tipo', () => {
      let out: any;
      service.getDewormings(PET).subscribe(r => (out = r));
      const req = http.expectOne(r => r.url === `${base}/dewormings`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('petId')).toBe(PET);
      req.flush({ dewormings: { INTERNAL: { registered: true, lastApplicationDate: '2026-10-01' }, EXTERNAL: { registered: false, lastApplicationDate: null } } });
      expect(out.INTERNAL.registered).toBeTrue();
      expect(out.EXTERNAL.registered).toBeFalse();
    });

    it('registra con POST /dewormings, sin userId en el cuerpo (sale del token)', () => {
      let out: any;
      const body = { petId: PET, kind: 'INTERNAL' as const, product: 'Drontal', dose: '1 tableta', weightKg: 4.2, applicationDate: '2026-10-01' };
      service.addDeworming(body).subscribe(r => (out = r));
      const req = http.expectOne(`${base}/dewormings`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      expect('userId' in req.request.body).toBeFalse();
      req.flush({ id: 'd-1', kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-10-01' });
      expect(out.id).toBe('d-1');
      expect(out.product).toBe('Drontal');
    });

    it('anula con POST /dewormings/{id}/corrections: motivo y ENTERED_IN_ERROR (no se borra)', () => {
      service.voidDeworming('d-1', 'Me equivoqué de fecha').subscribe();
      const req = http.expectOne(`${base}/dewormings/d-1/corrections`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Me equivoqué de fecha', status: 'ENTERED_IN_ERROR' });
      req.flush({ id: 'd-1', version: 2 }, { status: 201, statusText: 'Created' });
    });

    it('una fecha futura (400 VALIDATION_ERROR) llega como HealthError con su código', () => {
      let err: HealthError | undefined;
      service.addDeworming({ petId: PET, kind: 'INTERNAL', product: 'X', applicationDate: '2099-01-01' }).subscribe({ error: e => (err = e) });
      http.expectOne(`${base}/dewormings`).flush({ code: 'VALIDATION_ERROR' }, { status: 400, statusText: 'Bad Request' });
      expect(err?.code).toBe('VALIDATION_ERROR');
      expect(err?.status).toBe(400);
    });
  });

  describe('alergias', () => {
    it('lista con GET /allergies?petId= y trae el estado general', () => {
      let out: any;
      service.getAllergies(PET).subscribe(r => (out = r));
      const req = http.expectOne(r => r.url === `${base}/allergies`);
      expect(req.request.params.get('petId')).toBe(PET);
      req.flush({ allergyStatus: 'HAS_ALLERGIES', allergies: [{ id: 'a1', allergen: 'Penicilina', category: 'DRUG', severity: 'SEVERE', status: 'SUSPECTED' }] });
      expect(out.allergyStatus).toBe('HAS_ALLERGIES');
      expect(out.allergies[0].allergen).toBe('Penicilina');
    });

    it('declara con POST /allergies y queda SUSPECTED', () => {
      let out: any;
      const body = { petId: PET, allergen: 'Penicilina', category: 'DRUG' as const, severity: 'SEVERE' as const, reaction: 'Urticaria' };
      service.addAllergy(body).subscribe(r => (out = r));
      const req = http.expectOne(`${base}/allergies`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: 'a1', allergen: 'Penicilina', status: 'SUSPECTED' }, { status: 201, statusText: 'Created' });
      expect(out.state).toBe('SUSPECTED');
    });

    it('resuelve o marca por error con /corrections y motivo; nunca manda CONFIRMED', () => {
      service.changeAllergyState('a1', 'RESOLVED', 'Lo descartó el veterinario').subscribe();
      const req = http.expectOne(`${base}/allergies/a1/corrections`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Lo descartó el veterinario', status: 'RESOLVED' });
      req.flush({ version: 2 }, { status: 201, statusText: 'Created' });
    });

    it('"sin alergias conocidas" va a PUT /pets/{id}/clinical-profile; con alergias vigentes responde 409', () => {
      let err: HealthError | undefined;
      service.setAllergyStatus(PET, 'NONE_KNOWN').subscribe({ error: e => (err = e) });
      const req = http.expectOne(`${base}/pets/${PET}/clinical-profile`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ allergyStatus: 'NONE_KNOWN' });
      req.flush({ code: 'ACTIVE_ALLERGIES_EXIST' }, { status: 409, statusText: 'Conflict' });
      expect(err?.code).toBe('ACTIVE_ALLERGIES_EXIST');
    });
  });

  describe('esterilización', () => {
    it('PUT /pets/{id}/clinical-profile con estado y fecha; devuelve el dato con su origen', () => {
      let out: any;
      service.setNeutered(PET, 'YES', '2024-03-01').subscribe(r => (out = r));
      const req = http.expectOne(`${base}/pets/${PET}/clinical-profile`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ neuteredStatus: 'YES', neuteredAt: '2024-03-01' });
      req.flush({ neutered: { status: 'YES', at: '2024-03-01', source: 'OWNER' } });
      expect(out.status).toBe('YES');
      expect(out.source).toBe('OWNER');
    });

    it('la fecha solo se manda con YES', () => {
      service.setNeutered(PET, 'NO', '2024-03-01').subscribe();
      const req = http.expectOne(`${base}/pets/${PET}/clinical-profile`);
      expect(req.request.body).toEqual({ neuteredStatus: 'NO' });
      req.flush({ neutered: { status: 'NO' } });
    });

    it('una fecha futura o anterior al nacimiento es VALIDATION_ERROR', () => {
      let err: HealthError | undefined;
      service.setNeutered(PET, 'YES', '2099-01-01').subscribe({ error: e => (err = e) });
      http.expectOne(`${base}/pets/${PET}/clinical-profile`).flush({ code: 'VALIDATION_ERROR' }, { status: 400, statusText: 'Bad Request' });
      expect(err?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('resumen del perfil', () => {
    it('GET /pets/{id}/clinical-summary y normaliza esterilización, alergias y prevención', () => {
      let out: any;
      service.getSummary(PET).subscribe(r => (out = r));
      const req = http.expectOne(`${base}/pets/${PET}/clinical-summary`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: { allergies: [{ allergen: 'Pollo', severity: 'MILD', status: 'CONFIRMED' }], neutered: { status: 'NO' }, prevention: {} } });
      expect(out.allergies.length).toBe(1);
      expect(out.neutered.status).toBe('NO');
      expect(out.prevention.INTERNAL.state).toBe('NONE');
    });

    it('sin /clinical-summary en el gateway arma el resumen con /dewormings y /allergies (solo falta esterilización)', () => {
      let out: any;
      service.getSummary(PET).subscribe(s => (out = s));
      http.expectOne(`${base}/pets/${PET}/clinical-summary`).flush({ error: 'Ruta no encontrada' }, { status: 404, statusText: 'Not Found' });
      http.expectOne(r => r.url === `${base}/dewormings`).flush({
        petId: PET, dewormings: { INTERNAL: { registered: true, lastApplicationDate: '2026-10-01' }, EXTERNAL: { registered: false, lastApplicationDate: null } }, items: [],
      });
      http.expectOne(r => r.url === `${base}/allergies`).flush({ petId: PET, allergyStatus: 'UNKNOWN', allergies: [] });
      expect(out.neuteredUnavailable).toBeTrue();
      expect(out.neutered.status).toBe('UNKNOWN');
      expect(out.prevention.INTERNAL.registered).toBeTrue();
      expect(out.prevention.EXTERNAL.state).toBe('NONE');
      expect(out.allergyStatus).toBe('UNKNOWN');
      // La siguiente mascota ya no vuelve a pedir /clinical-summary
      service.getSummary('otra').subscribe();
      http.expectNone(`${base}/pets/otra/clinical-summary`);
      http.match(r => /\/(dewormings|allergies)$/.test(r.url)).forEach(r => r.flush({}));
    });

    it('si tampoco responden /dewormings ni /allergies sale como NOT_AVAILABLE', () => {
      let err: HealthError | undefined;
      service.getSummary(PET).subscribe({ error: e => (err = e) });
      http.expectOne(`${base}/pets/${PET}/clinical-summary`).flush({ error: 'Ruta no encontrada' }, { status: 404, statusText: 'Not Found' });
      http.expectOne(r => r.url === `${base}/dewormings`).flush({ error: 'Ruta no encontrada' }, { status: 404, statusText: 'Not Found' });
      // forkJoin cancela /allergies al fallar /dewormings
      http.match(r => r.url === `${base}/allergies`).filter(r => !r.cancelled).forEach(r => r.flush({}, { status: 404, statusText: 'Not Found' }));
      expect(err?.code).toBe('NOT_AVAILABLE');
    });

    it('sin conexión sale como NETWORK', () => {
      let err: HealthError | undefined;
      service.getAllergies(PET).subscribe({ error: e => (err = e) });
      http.expectOne(r => r.url === `${base}/allergies`).error(new ProgressEvent('error'), { status: 0 });
      expect(err?.code).toBe('NETWORK');
    });
  });

  describe('acceso a la mascota', () => {
    it('el dueño puede editar sin consultar los perfiles compartidos', () => {
      petService.getPetById.and.returnValue(of({ id: PET, ownerId: 'u-1', name: 'Luna' }));
      let out: any;
      service.loadAccess(PET).subscribe(r => (out = r));
      expect(out.role).toBe('OWNER');
      expect(out.canEdit).toBeTrue();
      expect(shared.getMyRoleForPet).not.toHaveBeenCalled();
    });

    it('una mascota compartida: EDITOR edita y VIEWER solo lee', () => {
      petService.getPetById.and.returnValue(of({ id: PET, ownerId: 'otro', name: 'Luna' }));
      const outs: any[] = [];
      shared.getMyRoleForPet.and.returnValue(of('EDITOR'));
      service.loadAccess(PET).subscribe(r => outs.push(r));
      shared.getMyRoleForPet.and.returnValue(of('VIEWER'));
      service.loadAccess(PET).subscribe(r => outs.push(r));
      expect(outs.map(o => o.canEdit)).toEqual([true, false]);
    });
  });
});
