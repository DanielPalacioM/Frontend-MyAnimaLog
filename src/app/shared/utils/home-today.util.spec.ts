import { Appointment } from 'src/app/models/appointment.model';
import { GREETING_BANK, birthdayAge, buildGreeting, buildTodayItems, momentOf, petsLabel, weekDays } from './home-today.util';

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
