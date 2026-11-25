import { Appointment } from 'src/app/models/appointment.model';
import { GREETING_BANK, agendaEntries, birthdayAge, buildGreeting, buildTodayItems, dayTitle, momentOf, petChip, petLine, petsLabel, weekDays, weekTitle } from './home-today.util';

const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min);
const NOW = at(2026, 11, 25, 15, 20); // miércoles 25 nov, 3:20 p. m.
const appt = (over: Partial<Appointment>): Appointment => ({
  id: 'a', veterinaryId: 'v1', clinicName: 'Clínica Patitas', clinicLogoUrl: null, address: '', petId: 'p1', petName: 'Luna', serviceId: 's',
  serviceName: 'Control', durationMinutes: 30, price: null, employeeName: '', startsAt: at(2026, 11, 26, 10).toISOString(), endsAt: '',
  status: 'CONFIRMED', origin: 'APP', notes: '', cancellationReason: '', cancelledBy: '', cancellableUntil: null, ...over,
});
const pets = [{ id: 'p1', name: 'Luna', birthDate: '2022-01-15' }, { id: 'p2', name: 'Thor', birthDate: '2015-04-02' }];

describe('home-today.util', () => {
  it('momento del día por la hora', () => {
    expect(momentOf(at(2026, 11, 25, 7))).toBe('morning');
    expect(momentOf(at(2026, 11, 25, 15))).toBe('afternoon');
    expect(momentOf(at(2026, 11, 25, 21))).toBe('night');
    expect(momentOf(at(2026, 11, 25, 2))).toBe('night');
  });

  it('nombres de las mascotas en la frase', () => {
    expect(petsLabel([{ name: 'Luna' }])).toBe('Luna');
    expect(petsLabel([{ name: 'Luna' }, { name: 'Thor' }])).toBe('Luna y Thor');
    expect(petsLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe('A, B y C');
    expect(petsLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }])).toBe('tus mascotas');
  });

  describe('Para hoy', () => {
    it('lo vencido va primero, luego las citas de hoy y mañana, luego lo que vence pronto; nada lejano', () => {
      const items = buildTodayItems({
        now: NOW,
        appointments: [appt({}), appt({ id: 'far', startsAt: at(2026, 12, 10, 10).toISOString() }), appt({ id: 'x', status: 'CANCELLED' })],
        vaccines: [
          { petId: 'p2', petName: 'Thor', name: 'Rabia', applicationDate: '2025-11-30', nextDoseDate: '2026-11-30' },
          { petId: 'p1', petName: 'Luna', name: 'Moquillo', applicationDate: '2025-01-01', nextDoseDate: '2026-01-01' },
        ],
        prevention: [
          { petId: 'p1', petName: 'Luna', kind: 'EXTERNAL', state: 'OVERDUE', nextDoseDate: '2026-11-18' },
          { petId: 'p2', petName: 'Thor', kind: 'INTERNAL', state: 'OK', nextDoseDate: '2027-01-10' },
        ],
      });
      expect(items.map(i => i.kind)).toEqual(['vaccine', 'deworming', 'appointment', 'vaccine']);
      expect(items[0].tone).toBe('bad'); // Moquillo vencida
      expect(items[2].title).toBe('Cita confirmada mañana');
      expect(items[3].title).toBe('Rabia de Thor vence en 5 días');
      expect(items[1].action.route).toEqual(['/pet-health', 'p1', 'deworming', 'new']);
    });

    it('una vacuna ya reforzada no cuenta (solo la última dosis)', () => {
      const items = buildTodayItems({ now: NOW, appointments: [], prevention: [], vaccines: [
        { petId: 'p1', petName: 'Luna', name: 'Rabia', applicationDate: '2025-01-01', nextDoseDate: '2026-01-01' },
        { petId: 'p1', petName: 'Luna', name: 'Rabia', applicationDate: '2026-01-02', nextDoseDate: '2027-01-02' },
      ] });
      expect(items).toEqual([]);
    });

    it('una cita sin confirmar lo dice', () => {
      const [i] = buildTodayItems({ now: NOW, appointments: [appt({ status: 'REQUESTED', startsAt: at(2026, 11, 25, 17).toISOString() })], vaccines: [], prevention: [] });
      expect(i.title).toBe('Cita hoy: falta que la clínica confirme');
      expect(i.action.route).toEqual(['/vet/appointments']);
    });
  });

  describe('Saludo', () => {
    it('sin mascotas: bienvenida con "Agregar mascota"', () => {
      const g = buildGreeting({ name: 'Luis', now: NOW, pets: [], items: [] });
      expect(g.mood).toBe('welcome');
      expect(g.cta?.kind).toBe('addPet');
    });

    it('el cumpleaños de una mascota gana sobre todo lo demás', () => {
      const g = buildGreeting({ name: 'Luis', now: at(2026, 1, 15, 9), pets, items: buildTodayItems({ now: NOW, appointments: [appt({})], vaccines: [], prevention: [] }) });
      expect(g.mood).toBe('birthday');
      expect(g.title).toBe('¡Hoy Luna cumple 4 años!');
      expect(g.cta).toEqual({ label: 'Ver a Luna', kind: 'pet', petId: 'p1' });
      expect(birthdayAge('2026-01-15', at(2026, 1, 15))).toBeNull(); // el día que nace no "cumple"
    });

    it('de tarde con pendientes: cuántos y "Ver lo de hoy"', () => {
      const items = buildTodayItems({ now: NOW, appointments: [appt({})], vaccines: [], prevention: [{ petId: 'p1', petName: 'Luna', kind: 'EXTERNAL', state: 'OVERDUE', nextDoseDate: '2026-11-18' }] });
      const g = buildGreeting({ name: 'Luis', now: NOW, pets, items });
      expect(g.mood).toBe('afternoon');
      expect(g.title).toBe('¡Buenas tardes, Luis!');
      expect(g.line).toBe('Hoy hay 2 cosas para Luna y Thor. Vamos paso a paso.');
      expect(g.cta?.label).toBe('Ver lo de hoy (2)');
    });

    it('con un solo pendiente lo nombra', () => {
      const items = buildTodayItems({ now: at(2026, 11, 25, 8), appointments: [appt({})], vaccines: [], prevention: [] });
      const g = buildGreeting({ name: 'Luis', now: at(2026, 11, 25, 8), pets, items });
      expect(g.title).toBe('¡Buenos días, Luis!');
      expect(g.line).toBe('Cita confirmada mañana. Vamos paso a paso.');
    });

    it('todo al día: una frase del banco que no cambia al recargar, pero sí otro día', () => {
      const a = buildGreeting({ name: 'Luis', now: NOW, pets, items: [] });
      const b = buildGreeting({ name: 'Luis', now: at(2026, 11, 25, 16), pets, items: [] });
      expect(a.chip).toBe('✓ Todo al día');
      expect(a.line).toBe(b.line);
      const lines = new Set([20, 21, 22, 23, 24].map(d => buildGreeting({ name: 'Luis', now: at(2026, 11, d, 15), pets, items: [] }).line));
      expect(lines.size).toBe(GREETING_BANK.length);
    });

    it('de noche: lo de mañana y "Descansa"', () => {
      const night = at(2026, 11, 25, 21);
      const items = buildTodayItems({ now: night, appointments: [appt({})], vaccines: [], prevention: [] });
      const g = buildGreeting({ name: 'Luis', now: night, pets, items });
      expect(g.mood).toBe('night');
      expect(g.line).toContain('Mañana tienes cita');
      expect(g.bubble).toBe('zzz');
      expect(buildGreeting({ name: 'Luis', now: night, pets, items: [] }).line).toBe('Luna y Thor ya están soñando. Descansa.');
    });

    it('sin nombre no deja una coma suelta', () => {
      expect(buildGreeting({ name: '', now: NOW, pets, items: [] }).title).toBe('¡Buenas tardes!');
    });
  });

  it('la semana va de lunes a domingo, marca hoy y pone punto en días con cita o evento', () => {
    const w = weekDays(NOW, [at(2026, 11, 26, 10).toISOString()], [at(2026, 11, 29, 9).toISOString(), at(2026, 11, 26, 8).toISOString()]);
    expect(w.map(d => d.num)).toEqual([23, 24, 25, 26, 27, 28, 29]);
    expect(w.map(d => d.letter).join('')).toBe('LMMJVSD');
    expect(w.find(d => d.today)?.num).toBe(25);
    expect(w[3].mark).toBe('appointment'); // la cita gana sobre el evento del mismo día
    expect(w[6].mark).toBe('event');
    expect(w[0].mark).toBeNull();
  });
});

describe('chip de salud de cada mascota', () => {
  const NOW2 = new Date(2026, 10, 25, 15);
  const vac = (next: string, app = '2025-11-01') => ({ petId: 'p', petName: 'L', name: 'Rabia', applicationDate: app, nextDoseDate: next });
  it('prioridad: alergia grave > vencido > por vencer > al día > sin vacunas', () => {
    expect(petChip({ now: NOW2, severeAllergy: true, vaccines: [vac('2026-01-01')], prevention: [] }).label).toBe('Alergia grave');
    expect(petChip({ now: NOW2, severeAllergy: false, vaccines: [vac('2026-01-01')], prevention: [] }).label).toBe('Vacuna vencida');
    expect(petChip({ now: NOW2, severeAllergy: false, vaccines: [], prevention: [{ petId: 'p', petName: 'L', kind: 'EXTERNAL', state: 'OVERDUE', nextDoseDate: '' }] }).label).toBe('Toca desparasitar');
    expect(petChip({ now: NOW2, severeAllergy: false, vaccines: [vac('2026-11-30')], prevention: [] }).label).toBe('Vacuna por vencer');
    expect(petChip({ now: NOW2, severeAllergy: false, vaccines: [vac('2027-06-01')], prevention: [] }).label).toBe('Vacunas al día');
    expect(petChip({ now: NOW2, severeAllergy: false, vaccines: [], prevention: [] }).label).toBe('Sin vacunas registradas');
  });
  it('raza y edad', () => {
    expect(petLine({ breed: 'Labrador', birthDate: '2022-01-15' }, NOW2)).toBe('Labrador · 4 años');
    expect(petLine({ species: 'Gato', birthDate: '2026-03-10' }, NOW2)).toBe('Gato · 8 meses');
    expect(petLine({ breed: 'Pitbull' }, NOW2)).toBe('Pitbull');
  });
});

describe('semana deslizable y agenda del día', () => {
  const NOW3 = new Date(2026, 10, 25, 15); // miércoles 25 nov
  const ap = (over: any) => ({ id: 'a', veterinaryId: 'v1', clinicName: 'Patitas', petName: 'Luna', serviceName: 'Control', status: 'CONFIRMED', startsAt: new Date(2026, 10, 26, 10).toISOString(), ...over });

  it('cambia de semana hacia adelante y hacia atrás', () => {
    expect(weekDays(NOW3, [], [], 1).map(d => d.num)).toEqual([30, 1, 2, 3, 4, 5, 6]);
    expect(weekDays(NOW3, [], [], -1).map(d => d.num)).toEqual([16, 17, 18, 19, 20, 21, 22]);
    expect(weekDays(NOW3, [], [], 1).some(d => d.today)).toBeFalse();
  });

  it('título de la semana', () => {
    expect(weekTitle(weekDays(NOW3, [], []), 0)).toBe('Esta semana');
    expect(weekTitle(weekDays(NOW3, [], [], 1), 1)).toBe('Próxima semana');
    expect(weekTitle(weekDays(NOW3, [], [], -1), -1)).toBe('Semana pasada');
    expect(weekTitle(weekDays(NOW3, [], [], 2), 2)).toContain('–');
  });

  it('título del día elegido', () => {
    expect(dayTitle('2026-11-25', NOW3)).toBe('Hoy');
    expect(dayTitle('2026-11-26', NOW3)).toBe('Mañana');
    expect(dayTitle('2026-11-24', NOW3)).toBe('Ayer');
    expect(dayTitle('2026-11-28', NOW3).toLowerCase()).toContain('sábado');
  });

  it('la agenda junta citas vivas y eventos, ordenados por día y hora', () => {
    const list = agendaEntries(
      [ap({}), ap({ id: 'x', status: 'CANCELLED' }), ap({ id: 'r', status: 'REQUESTED', startsAt: new Date(2026, 10, 26, 8).toISOString() })] as any,
      [{ id: 'e1', title: 'Baño', start_date: '2026-11-26T15:00:00', pet_id: 'p1' }, { id: 'e2', title: 'Pastilla', start_date: '2026-11-25T09:00:00', pet_id: null }],
      [{ id: 'p1', name: 'Luna' }]
    );
    expect(list.map(e => e.id)).toEqual(['ev:e2', 'appt:r', 'appt:a', 'ev:e1']);
    const req = list.find(e => e.id === 'appt:r')!;
    expect(req.detail).toContain('Pendiente de confirmación');
    expect(req.route).toEqual(['/vet/appointments']);
    const bath = list.find(e => e.id === 'ev:e1')!;
    expect(bath.detail).toBe('Luna');
    expect(bath.time).toBe('15:00');
    expect(bath.queryParams).toEqual({ eventId: 'e1', petId: 'p1' });
  });
});
