import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { VetError } from 'src/app/models/veterinary.model';
import { VeterinaryService } from './veterinary';

// Las respuestas de ejemplo son las de la carpeta 11 de la colección de Postman (Fase 4A).
describe('VeterinaryService', () => {
  let service: VeterinaryService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/veterinary`;
  const VET = '9a1c2f3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VeterinaryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('previewByCode manda el código normalizado en el body (nunca en la URL)', () => {
    let out: any;
    service.previewByCode(' vet-7k2m9qxa ').subscribe(r => (out = r));
    const req = http.expectOne(`${base}/links/preview`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'VET-7K2M9QXA' });
    req.flush({ veterinaryId: VET, name: 'Clínica Veterinaria El Bosque', logoUrl: null, city: 'Bogotá', department: 'Bogotá D.C.', address: 'Calle 1 # 2-3', alreadyLinked: false });
    expect(out.name).toBe('Clínica Veterinaria El Bosque');
    expect(out.veterinaryId).toBe(VET);
    expect(out.alreadyLinked).toBeFalse();
  });

  it('link: caso nuevo y caso idempotente (alreadyLinked)', () => {
    const results: any[] = [];
    service.link('VET-7K2M9QXA').subscribe(r => results.push(r));
    http.expectOne(`${base}/links`).flush({ id: 'x', veterinaryId: VET, veterinaryName: 'El Bosque', status: 'LINKED', linkedAt: '2026-11-08T14:00:00', alreadyLinked: false });
    service.link('VET-7K2M9QXA').subscribe(r => results.push(r));
    http.expectOne(`${base}/links`).flush({ id: 'x', veterinaryId: VET, veterinaryName: 'El Bosque', status: 'LINKED', linkedAt: '2026-10-01T09:00:00', alreadyLinked: true });
    expect(results.map(r => r.alreadyLinked)).toEqual([false, true]);
    expect(results[0].veterinaryName).toBe('El Bosque');
  });

  it('un 404 LINK_CODE_NOT_FOUND llega como VetError con su código', () => {
    let err: VetError | undefined;
    service.link('VET-AAAAAAAA').subscribe({ error: e => (err = e) });
    http.expectOne(`${base}/links`).flush({ code: 'LINK_CODE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect(err?.code).toBe('LINK_CODE_NOT_FOUND');
    expect(err?.status).toBe(404);
  });

  it('getLinked desempaqueta { veterinaries } y acepta snake_case', () => {
    let out: any[] = [];
    service.getLinked().subscribe(r => (out = r));
    http.expectOne(`${base}/me/linked-veterinaries`).flush({
      veterinaries: [
        { veterinaryId: VET, name: 'El Bosque', logoUrl: 'https://x/l.png', city: 'Bogotá', phone: '+573001234567', status: 'ACTIVE', linkedAt: '2026-10-01T09:00:00', sharedPetsCount: 2 },
        { veterinary_id: 'otra', name: 'Pet Care', linked_at: '2026-10-02T09:00:00', shared_pets_count: 0, status: 'ACTIVE' },
      ],
    });
    expect(out.length).toBe(2);
    expect(out[0].sharedPetsCount).toBe(2);
    expect(out[1].veterinaryId).toBe('otra');
    expect(out[1].linkedAt).toBe('2026-10-02T09:00:00');
  });

  it('unlink hace DELETE y devuelve cuántas mascotas se revocaron', () => {
    let out: any;
    service.unlink(VET).subscribe(r => (out = r));
    const req = http.expectOne(`${base}/me/linked-veterinaries/${VET}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ userId: 'u', veterinaryId: VET, revokedPetsCount: 2, message: 'User unlinked successfully' });
    expect(out.revokedPetsCount).toBe(2);
  });

  it('sharePets manda petIds y 403 PET_NOT_OWNED llega como error', () => {
    let out: any;
    service.sharePets(VET, ['p1', 'p2']).subscribe(r => (out = r));
    const req = http.expectOne(`${base}/me/linked-veterinaries/${VET}/pets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ petIds: ['p1', 'p2'] });
    req.flush({ veterinaryId: VET, veterinaryName: 'El Bosque', sharedCount: 1, pets: [{ petId: 'p1', petName: 'Max', species: 'DOG', grantedAt: '2026-11-08T14:10:00', alreadyShared: false }] });
    expect(out.sharedCount).toBe(1);
    expect(out.pets[0].petName).toBe('Max');

    let err: VetError | undefined;
    service.sharePets(VET, ['ajena']).subscribe({ error: e => (err = e) });
    http.expectOne(`${base}/me/linked-veterinaries/${VET}/pets`).flush({ code: 'PET_NOT_OWNED' }, { status: 403, statusText: 'Forbidden' });
    expect(err?.code).toBe('PET_NOT_OWNED');
  });

  it('revokePet hace DELETE de esa mascota', () => {
    let out: any;
    service.revokePet(VET, 'p1').subscribe(r => (out = r));
    const req = http.expectOne(`${base}/me/linked-veterinaries/${VET}/pets/p1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ veterinaryId: VET, petId: 'p1', petName: 'Max', revokedAt: '2026-11-08T15:00:00', alreadyRevoked: false });
    expect(out.petName).toBe('Max');
    expect(out.alreadyRevoked).toBeFalse();
  });

  it('getVetsForPet lee las clínicas que ven la mascota', () => {
    let out: any[] = [];
    service.getVetsForPet('p1').subscribe(r => (out = r));
    http.expectOne(`${base}/me/pets/p1/veterinaries`).flush({ petId: 'p1', veterinaries: [{ veterinaryId: VET, name: 'El Bosque', logoUrl: null, city: 'Bogotá', grantedAt: '2026-11-08T14:10:00' }] });
    expect(out[0].grantedAt).toBe('2026-11-08T14:10:00');
  });

  describe('loadSharing', () => {
    it('sin mascotas no hace ninguna petición', () => {
      let out: Map<string, any[]> | undefined;
      service.loadSharing([]).subscribe(r => (out = r));
      http.expectNone(() => true);
      expect(out?.size).toBe(0);
    });

    it('arma el mapa clínica → mascotas y tolera que una consulta falle', () => {
      let out: Map<string, any[]> | undefined;
      spyOn(console, 'error');
      service.loadSharing([{ id: 'p1', name: 'Juan' }, { id: 'p2', name: 'Milor' }, { id: 'p3', name: 'Rocky' }]).subscribe(r => (out = r));
      http.expectOne(`${base}/me/pets/p1/veterinaries`).flush({ veterinaries: [{ veterinaryId: 'A', name: 'A', grantedAt: '2026-03-03T15:02:00' }, { veterinaryId: 'B', name: 'B' }] });
      http.expectOne(`${base}/me/pets/p2/veterinaries`).flush({ veterinaries: [{ veterinaryId: 'B', name: 'B' }] });
      http.expectOne(`${base}/me/pets/p3/veterinaries`).flush({ code: 'EXTERNAL_SERVICE_UNAVAILABLE' }, { status: 503, statusText: 'x' });

      expect(out?.get('A')?.map(p => p.name)).toEqual(['Juan']);
      expect(out?.get('A')?.[0].grantedAt).toBe('2026-03-03T15:02:00');
      expect(out?.get('B')?.map(p => p.name)).toEqual(['Juan', 'Milor']);
      expect(out?.get('A')?.some(p => p.name === 'Rocky')).toBeFalse();
    });
  });
});
