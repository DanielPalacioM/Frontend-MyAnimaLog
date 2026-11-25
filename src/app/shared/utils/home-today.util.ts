import { Appointment } from 'src/app/models/appointment.model';
import { PreventionState } from 'src/app/models/pet-health.model';

// Lógica pura del Home: el saludo del día, "Para hoy" y la tira de la semana.
// Diseño en Figma: componente "Home/Saludo" (5 momentos) y pantallas "Home · propuesta".

export type GreetingMood = 'morning' | 'afternoon' | 'night' | 'welcome' | 'birthday';

export interface TodayItem {
  id: string;
  kind: 'appointment' | 'vaccine' | 'deworming';
  tone: 'info' | 'warn' | 'bad';
  icon: string;
  title: string;
  detail: string;
  action: { label: string; route: any[]; queryParams?: Record<string, string> };
  /** Menor = más urgente. */
  rank: number;
  /** Para desempatar (ms). */
  at: number;
}

export interface GreetingView {
  mood: GreetingMood;
  date: string;
  title: string;
  line: string;
  bubble: string;
  cta?: { label: string; kind: 'today' | 'addPet' | 'pet'; petId?: string };
  chip?: string;
}

export interface PetLite { id: string; name: string; birthDate?: string | null; }
export interface VaccineLite { petId: string; petName: string; name: string; applicationDate: string; nextDoseDate?: string | null; }
export interface PreventionLite { petId: string; petName: string; kind: 'INTERNAL' | 'EXTERNAL'; state: PreventionState; nextDoseDate: string; }

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyToUtc = (k: string) => { const [y, m, d] = k.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
/** Días de calendario entre hoy y una fecha (negativo = ya pasó). */
export const daysFrom = (now: Date, iso: string): number => Math.round((keyToUtc(iso) - keyToUtc(localKey(now))) / DAY);

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function momentOf(d: Date): 'morning' | 'afternoon' | 'night' {
  const h = d.getHours();
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 19 ? 'afternoon' : 'night';
}

/** "Luna", "Luna y Thor", "Luna, Thor y Max"; con más de 3, "tus mascotas". */
export function petsLabel(pets: { name: string }[]): string {
  const n = pets.map(p => p.name).filter(Boolean);
  if (!n.length || n.length > 3) return 'tus mascotas';
  return n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
}

// ---------------------------------------------------------------- Para hoy

/**
 * Lo que necesitan hoy las mascotas, del más urgente al menos: vencidos, citas de hoy y mañana, y lo que vence en 7 días.
 * El Home muestra los 3 primeros.
 */
export function buildTodayItems(input: { now: Date; appointments: Appointment[]; vaccines: VaccineLite[]; prevention: PreventionLite[] }): TodayItem[] {
  const { now } = input;
  const items: TodayItem[] = [];

  for (const a of input.appointments) {
    if (!['REQUESTED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status)) continue;
    const t = new Date(a.startsAt).getTime();
    if (!(t >= now.getTime() - 2 * 3600_000)) continue;
    const d = daysFrom(now, localKey(new Date(t)));
    if (d > 1) continue;
    const when = d <= 0 ? 'hoy' : 'mañana';
    const confirmed = a.status !== 'REQUESTED';
    items.push({
      id: `appt:${a.id}`, kind: 'appointment', tone: 'info', icon: 'calendar-outline',
      title: confirmed ? `Cita confirmada ${when}` : `Cita ${when}: falta que la clínica confirme`,
      detail: [hhmm(a.startsAt), a.serviceName, a.clinicName].filter(Boolean).join(' · '),
      action: { label: 'Ver', route: ['/vet/appointments'], queryParams: a.veterinaryId ? { veterinaryId: a.veterinaryId } : undefined },
      rank: d <= 0 ? 1 : 2, at: t,
    });
  }

  // Vacunas: solo la última dosis de cada vacuna por mascota cuenta.
  const latest = new Map<string, VaccineLite>();
  for (const v of input.vaccines) {
    const k = `${v.petId}|${(v.name || '').trim().toLowerCase()}`;
    const prev = latest.get(k);
    if (!prev || (v.applicationDate || '') > (prev.applicationDate || '')) latest.set(k, v);
  }
  for (const v of latest.values()) {
    if (!v.nextDoseDate) continue;
    const d = daysFrom(now, v.nextDoseDate);
    if (d > 7) continue;
    const bad = d < 0;
    items.push({
      id: `vac:${v.petId}:${v.name}`, kind: 'vaccine', tone: bad ? 'bad' : 'warn', icon: 'medkit-outline',
      title: bad ? `${v.name} de ${v.petName}: vencida` : `${v.name} de ${v.petName} vence ${d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`}`,
      detail: bad ? `Venció hace ${-d} ${-d === 1 ? 'día' : 'días'} · pide cita con tu clínica` : 'Pide la cita a tiempo',
      action: bad ? { label: 'Pedir cita', route: ['/vet'] } : { label: 'Ver', route: ['/vaccine-timeline'], queryParams: { petId: v.petId } },
      rank: bad ? 0 : 3, at: keyToUtc(v.nextDoseDate),
    });
  }

  for (const p of input.prevention) {
    if (p.state !== 'OVERDUE' && p.state !== 'DUE_SOON') continue;
    const bad = p.state === 'OVERDUE';
    const kind = p.kind === 'INTERNAL' ? 'interna' : 'externa';
    items.push({
      id: `dew:${p.petId}:${p.kind}`, kind: 'deworming', tone: bad ? 'bad' : 'warn', icon: 'bug-outline',
      title: bad ? `Desparasitación ${kind} de ${p.petName} vencida` : `Desparasitación ${kind} de ${p.petName} por vencer`,
      detail: p.nextDoseDate ? `${bad ? 'Tocaba' : 'Toca'} el ${new Date(keyToUtc(p.nextDoseDate)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}` : 'Registra la última dosis',
      action: { label: 'Registrar', route: ['/pet-health', p.petId, 'deworming', 'new'], queryParams: { kind: p.kind } },
      rank: bad ? 0 : 3, at: p.nextDoseDate ? keyToUtc(p.nextDoseDate) : 0,
    });
  }

  return items.sort((a, b) => a.rank - b.rank || a.at - b.at);
}

// ---------------------------------------------------------------- Saludo

/** Frases para un día sin pendientes: cambian cada día (semilla = fecha), no al recargar. */
export const GREETING_BANK = [
  '{pets} están al día. ¡Buen trabajo!',
  'Todo en orden por aquí. Hoy es un buen día para un paseo largo.',
  'Todo al día. Una caricia de más nunca sobra.',
  'Nada pendiente. Tus mascotas no dicen qué les duele; tú sí puedes anotarlo.',
  'Todo en orden. ¡Que hoy haya muchas colas felices!',
];

const daySeed = (d: Date) => Math.floor(keyToUtc(localKey(d)) / DAY);

/** Años que cumple hoy, o `null` si hoy no es su cumpleaños. */
export function birthdayAge(birthDate: string | null | undefined, now: Date): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}/.test(birthDate)) return null;
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number);
  if (m !== now.getMonth() + 1 || d !== now.getDate()) return null;
  const age = now.getFullYear() - y;
  return age > 0 ? age : null;
}

/**
 * Qué dice el saludo, por prioridad (Figma "Saludo · guía"): sin mascotas → bienvenida; cumpleaños; de noche, lo de mañana;
 * con pendientes, cuántos y el más urgente; todo al día, una frase del banco del día. Siempre con el nombre y según la hora.
 */
export function buildGreeting(input: { name: string; now: Date; pets: PetLite[]; items: TodayItem[] }): GreetingView {
  const { now, pets, items } = input;
  const name = (input.name || '').trim();
  const hi = (base: string) => name ? `${base}, ${name}!` : `${base}!`;
  const date = capital(now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));

  if (!pets.length) {
    return { mood: 'welcome', date, title: name ? `¡Hola, ${name}! Qué bueno tenerte aquí` : '¡Hola! Qué bueno tenerte aquí',
      line: 'Te ayudo a cuidar a tus mascotas. Empecemos por la primera.', bubble: '¡Hola!', cta: { label: 'Agregar mascota', kind: 'addPet' } };
  }

  for (const p of pets) {
    const age = birthdayAge(p.birthDate, now);
    if (age) {
      return { mood: 'birthday', date, title: `¡Hoy ${p.name} cumple ${age} ${age === 1 ? 'año' : 'años'}!`,
        line: `Feliz cumpleaños, ${p.name}. ¿Le tomas una foto?`, bubble: '¡Feliz cumple!', cta: { label: `Ver a ${p.name}`, kind: 'pet', petId: p.id } };
    }
  }

  const moment = momentOf(now);
  const label = petsLabel(pets);
  const n = items.length;

  if (moment === 'night') {
    const tomorrow = items.find(i => i.kind === 'appointment' && i.title.includes('mañana'));
    if (tomorrow) return { mood: 'night', date, title: hi('¡Buenas noches'), line: `Mañana tienes cita (${tomorrow.detail.split(' · ')[0]}). Descansa.`, bubble: 'zzz', chip: 'Cita mañana' };
    if (n) return { mood: 'night', date, title: hi('¡Buenas noches'), line: 'Mañana seguimos con lo pendiente. Descansa.', bubble: 'zzz', chip: `${n} por atender` };
    return { mood: 'night', date, title: hi('¡Buenas noches'), line: `${capital(label)} ya ${pets.length > 1 ? 'están' : 'está'} soñando. Descansa.`, bubble: 'zzz' };
  }

  const base = moment === 'morning' ? '¡Buenos días' : '¡Buenas tardes';
  if (n) {
    const line = n === 1 ? `${items[0].title}. Vamos paso a paso.` : `Hoy hay ${n} cosas para ${label}. Vamos paso a paso.`;
    return { mood: moment, date, title: hi(base), line, bubble: '¡Guau!', cta: { label: `Ver lo de hoy (${n})`, kind: 'today' } };
  }
  const phrase = GREETING_BANK[daySeed(now) % GREETING_BANK.length].replace('{pets}', capital(label));
  return { mood: moment, date, title: hi(base), line: phrase.replace(' están al día', pets.length > 1 ? ' están al día' : ' está al día'), bubble: '¡Bien!', chip: '✓ Todo al día' };
}

// ---------------------------------------------------------------- Semana

export interface WeekDay { key: string; letter: string; num: number; today: boolean; mark: 'appointment' | 'event' | null; }

/** Lunes a domingo de la semana de `now` (o `weekOffset` semanas antes/después), con un punto en los días que tienen cita (prioridad) o evento. */
export function weekDays(now: Date, appointmentDates: string[], eventDates: string[], weekOffset = 0): WeekDay[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
  const appt = new Set(appointmentDates.map(d => localKey(new Date(d))));
  const ev = new Set(eventDates.map(d => localKey(new Date(d))));
  const today = localKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = localKey(d);
    return { key, letter: 'LMMJVSD'[i], num: d.getDate(), today: key === today, mark: appt.has(key) ? 'appointment' : ev.has(key) ? 'event' : null };
  });
}

// ---------------------------------------------------------------- Chip de salud de cada mascota

export interface PetChip { label: string; tone: 'ok' | 'warn' | 'bad' | 'mute'; icon: string; }

/**
 * Un solo chip por mascota en su tarjeta del Home, el más importante: alergia grave > algo vencido > algo por vencer
 * > vacunas al día > sin vacunas registradas.
 */
export function petChip(input: { now: Date; severeAllergy: boolean; vaccines: VaccineLite[]; prevention: PreventionLite[] }): PetChip {
  if (input.severeAllergy) return { label: 'Alergia grave', tone: 'bad', icon: 'warning' };
  const latest = new Map<string, VaccineLite>();
  for (const v of input.vaccines) {
    const k = (v.name || '').trim().toLowerCase();
    const prev = latest.get(k);
    if (!prev || (v.applicationDate || '') > (prev.applicationDate || '')) latest.set(k, v);
  }
  const days = [...latest.values()].filter(v => v.nextDoseDate).map(v => daysFrom(input.now, v.nextDoseDate as string));
  const prevOverdue = input.prevention.some(p => p.state === 'OVERDUE');
  if (days.some(d => d < 0)) return { label: 'Vacuna vencida', tone: 'bad', icon: 'alert-circle' };
  if (prevOverdue) return { label: 'Toca desparasitar', tone: 'bad', icon: 'alert-circle' };
  if (days.some(d => d <= 7)) return { label: 'Vacuna por vencer', tone: 'warn', icon: 'time' };
  if (input.prevention.some(p => p.state === 'DUE_SOON')) return { label: 'Desparasitar pronto', tone: 'warn', icon: 'time' };
  if (latest.size) return { label: 'Vacunas al día', tone: 'ok', icon: 'checkmark-circle' };
  return { label: 'Sin vacunas registradas', tone: 'mute', icon: 'remove-circle' };
}

/** "Labrador · 3 años" / "Siamés · 8 meses". */
export function petLine(p: { breed?: string; species?: string; birthDate?: string | null }, now: Date): string {
  const parts = [p.breed || p.species || ''];
  if (p.birthDate && /^\d{4}-\d{2}-\d{2}/.test(p.birthDate)) {
    const [y, m, d] = p.birthDate.slice(0, 10).split('-').map(Number);
    const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) - (now.getDate() < d ? 1 : 0);
    if (months >= 0) parts.push(months < 12 ? `${months} ${months === 1 ? 'mes' : 'meses'}` : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? 'año' : 'años'}`);
  }
  return parts.filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- Agenda de un día (tira de la semana)

export interface AgendaEntry {
  id: string;
  /** YYYY-MM-DD local. */
  dateKey: string;
  /** HH:mm o vacío. */
  time: string;
  title: string;
  detail: string;
  kind: 'appointment' | 'event';
  route: any[];
  queryParams?: Record<string, string>;
}

export interface CalendarEventLite { id: string; title: string; start_date: string; pet_id?: string | null; }

/** Citas con clínicas (vivas) y eventos manuales como entradas de agenda, para la lista del día elegido. */
export function agendaEntries(appointments: Appointment[], events: CalendarEventLite[], pets: { id: string; name: string }[]): AgendaEntry[] {
  const petName = (id?: string | null) => pets.find(p => p.id === id)?.name ?? '';
  const out: AgendaEntry[] = [];
  for (const a of appointments) {
    if (!['REQUESTED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status)) continue;
    const d = new Date(a.startsAt);
    out.push({
      id: `appt:${a.id}`, dateKey: localKey(d),
      time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }),
      title: [a.serviceName || 'Cita', a.petName].filter(Boolean).join(' · '),
      detail: [a.clinicName, a.status === 'REQUESTED' ? 'Pendiente de confirmación' : a.status === 'CHECKED_IN' ? 'En la clínica' : 'Confirmada'].filter(Boolean).join(' · '),
      kind: 'appointment', route: ['/vet/appointments'], queryParams: a.veterinaryId ? { veterinaryId: a.veterinaryId } : undefined,
    });
  }
  for (const e of events) {
    if (!e?.start_date) continue;
    const key = e.start_date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    out.push({
      id: `ev:${e.id}`, dateKey: key, time: e.start_date.length > 15 ? e.start_date.slice(11, 16) : '',
      title: e.title || 'Evento', detail: petName(e.pet_id) || 'Evento del calendario',
      kind: 'event', route: ['/calendar/add-event'], queryParams: e.pet_id ? { eventId: e.id, petId: e.pet_id } : { eventId: e.id },
    });
  }
  return out.sort((x, y) => (x.dateKey + (x.time || '99')).localeCompare(y.dateKey + (y.time || '99')));
}

/** "Esta semana", "Próxima semana", "Semana pasada" o el rango ("30 nov – 6 dic"). */
export function weekTitle(days: WeekDay[], weekOffset: number): string {
  if (weekOffset === 0) return 'Esta semana';
  if (weekOffset === 1) return 'Próxima semana';
  if (weekOffset === -1) return 'Semana pasada';
  const fmt = (k: string) => new Date(keyToUtc(k)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
  return days.length ? `${fmt(days[0].key)} – ${fmt(days[6].key)}` : '';
}

/** "Hoy", "Mañana", "Ayer" o "Jueves 26 nov". */
export function dayTitle(key: string, now: Date): string {
  const d = daysFrom(now, key);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  const t = new Date(keyToUtc(key)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '').replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const todayKey = (now: Date = new Date()): string => localKey(now);
