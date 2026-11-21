import { of, throwError } from 'rxjs';
import { AddPetComponent } from './add-pet.component';

// Esterilización y alergias que se contestan al registrar la mascota (se guardan en Medical tras crearla).
describe('AddPetComponent · salud al registrar', () => {
  let health: any;
  let pets: any;
  let router: any;

  const make = () => {
    health = {
      setNeutered: jasmine.createSpy('setNeutered').and.returnValue(of({})),
      setAllergyStatus: jasmine.createSpy('setAllergyStatus').and.returnValue(of({})),
      addAllergy: jasmine.createSpy('addAllergy').and.returnValue(of({})),
    };
    pets = { addPet: jasmine.createSpy('addPet').and.returnValue(of({ id: 'p-1' })) };
    router = { url: '/add-pet', navigate: jasmine.createSpy('navigate') };
    const c = new AddPetComponent(router, { snapshot: { paramMap: { get: () => null } } } as any, pets, {} as any, health);
    c.ngOnInit();
    return c;
  };

  it('por defecto no se manda nada: "No sé" no es "no"', () => {
    const c = make();
    c.saveHealth('p-1').subscribe();
    expect(health.setNeutered).not.toHaveBeenCalled();
    expect(health.setAllergyStatus).not.toHaveBeenCalled();
    expect(health.addAllergy).not.toHaveBeenCalled();
  });

  it('esterilizada con fecha: la manda; "No" la manda sin fecha', () => {
    const c = make();
    c.petForm = { ...c.petForm, neuteredStatus: 'YES', neuteredAt: '2024-03-01' };
    c.saveHealth('p-1').subscribe();
    expect(health.setNeutered).toHaveBeenCalledWith('p-1', 'YES', '2024-03-01');
    c.petForm = { ...c.petForm, neuteredStatus: 'NO', neuteredAt: '' };
    c.saveHealth('p-1').subscribe();
    expect(health.setNeutered).toHaveBeenCalledWith('p-1', 'NO', undefined);
  });

  it('"No tiene alergias" guarda NONE_KNOWN; con alergias las declara una por una (sin las vacías)', () => {
    const c = make();
    c.petForm = { ...c.petForm, allergyAnswer: 'NO' };
    c.saveHealth('p-1').subscribe();
    expect(health.setAllergyStatus).toHaveBeenCalledWith('p-1', 'NONE_KNOWN');

    c.petForm = { ...c.petForm, allergyAnswer: 'YES', allergies: [{ allergen: ' Penicilina ', severity: 'SEVERE' }, { allergen: '  ', severity: 'MILD' }] };
    c.saveHealth('p-1').subscribe();
    expect(health.addAllergy).toHaveBeenCalledTimes(1);
    expect(health.addAllergy).toHaveBeenCalledWith({ petId: 'p-1', allergen: 'Penicilina', category: 'OTHER', severity: 'SEVERE' });
  });

  it('si un dato de salud falla, la mascota igual queda creada y se sigue', () => {
    const c = make();
    health.setNeutered.and.returnValue(throwError(() => ({ code: 'NOT_AVAILABLE' })));
    c.petForm = { ...c.petForm, name: 'Luna', species: 'Perro', sex: 'FEMALE', neuteredStatus: 'YES' };
    c.savePet();
    expect(pets.addPet).toHaveBeenCalled();
    expect(health.setNeutered).toHaveBeenCalledWith('p-1', 'YES', undefined);
    expect(router.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
    expect(c.isSaving).toBeFalse();
  });
});
