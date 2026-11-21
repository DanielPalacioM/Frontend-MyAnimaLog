import {
  Allergy,
  AllergyCategory,
  AllergyOverview,
  AllergySeverity,
  AllergyState,
  AllergyStatus,
  DewormingEntry,
  DewormingKind,
  DewormingKindStatus,
  DewormingOverview,
  HealthError,
  HealthErrorCode,
  HealthSummary,
  Neutered,
  NeuteredStatus,
  PreventionState,
} from 'src/app/models/pet-health.model';

type Raw = Record<string, any>;

const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const pick = (r: Raw | null | undefined, ...keys: string[]): any => {
  if (!r) return undefined;
  for (const k of keys) if (r[k] !== undefined && r[k] !== null) return r[k];
  return undefined;
};
/** `{ success, data }` o el valor directo. */
const unwrap = (res: unknown): any => (isObj(res) && 'data' in res ? res['data'] : res);

// ---------------------------------------------------------------- Fechas (siempre `YYYY-MM-DD`, en hora local)

const pad = (n: number): string => String(n).padStart(2, '0');

export function todayIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Deja solo la fecha (`2026-10-01T05:00:00Z` → `2026-10-01`); vacía si no es una fecha. */
export function isoDate(v: unknown): string {
  const s = text(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

const utc = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayIso(new Date(y, m - 1, d + days));
}

/** Días de `today` a `iso`: negativo si ya pasó. */
export function daysUntil(iso: string, today: string = todayIso()): number {
  return Math.round((utc(iso) - utc(today)) / 86_400_000);
}

/** "1 oct 2026" (formato de fecha visible de la app). */
export function healthDate(iso: string): string {
  if (!isoDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "mar 2024": la fecha de una esterilización puede ser aproximada. */
export function healthMonthYear(iso: string): string {
  if (!isoDate(iso)) return '';
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------- Desparasitación

export const DEWORMING_KINDS: DewormingKind[] = ['INTERNAL', 'EXTERNAL'];

export const DEWORMING_SCHEDULE_NOTE =
  'Es una sugerencia general según la edad. Tu veterinario puede indicarte otra fecha según el producto.';

export function dewormingKindLabel(kind: DewormingKind): string {
  return kind === 'INTERNAL' ? 'Interna' : 'Externa';
}

export function dewormingKindHint(kind: DewormingKind): string {
  return kind === 'INTERNAL' ? 'Lombrices y parásitos intestinales' : 'Pulgas y garrapatas';
}

export function preventionLabel(s: PreventionState): string {
  switch (s) {
    case 'OK': return 'Al día';
    case 'DUE_SOON': return 'Por vencer';
    case 'OVERDUE': return 'Vencida';
    default: return 'Sin registro';
  }
}

/** Por vencer = faltan 7 días o menos (el mismo aviso que se le manda al dueño). */
export const DUE_SOON_DAYS = 7;

export function stateFromDate(nextDoseDate: string, today: string = todayIso()): PreventionState {
  if (!isoDate(nextDoseDate)) return 'OK';
  const d = daysUntil(nextDoseDate, today);
  return d < 0 ? 'OVERDUE' : d <= DUE_SOON_DAYS ? 'DUE_SOON' : 'OK';
}

/** "en 12 días", "hoy", "hace 3 días": cuánto falta para la próxima dosis. */
export function dueText(nextDoseDate: string, today: string = todayIso()): string {
  if (!isoDate(nextDoseDate)) return '';
  const d = daysUntil(nextDoseDate, today);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 0) return `en ${d} días`;
  return `hace ${-d} días`;
}

/** Meses completos entre el nacimiento y una fecha (0 si falta alguna). */
export function ageMonthsAt(birthDate: string, onDate: string): number {
  if (!isoDate(birthDate) || !isoDate(onDate)) return 0;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  const months = (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Próxima dosis sugerida. Referencia general de `docs/DATOS_MASCOTA_CLINICA.md` §6.3 (debe validarla un veterinario):
 * interna cada 2 semanas hasta los 3 meses, mensual hasta los 6 y cada 3 meses después; externa, mensual.
 */
export function suggestNextDose(kind: DewormingKind, birthDate: string, applicationDate: string): string {
  if (!isoDate(applicationDate)) return '';
  if (kind === 'EXTERNAL') return addDays(applicationDate, 30);
  // Sin fecha de nacimiento no se sabe la edad: se trata como adulta (no se inventa un cachorro).
  if (!isoDate(birthDate)) return addDays(applicationDate, 90);
  const months = ageMonthsAt(birthDate, applicationDate);
  return addDays(applicationDate, months < 3 ? 14 : months < 6 ? 30 : 90);
}

const kindOf = (v: unknown): DewormingKind | null => {
  const s = text(v).toUpperCase();
  return s === 'INTERNAL' || s === 'INTERNA' ? 'INTERNAL' : s === 'EXTERNAL' || s === 'EXTERNA' ? 'EXTERNAL' : null;
};

export function normalizeDewormingEntry(r: Raw, fallbackKind: DewormingKind = 'INTERNAL'): DewormingEntry {
  const by = text(pick(r, 'administeredBy', 'administered_by', 'source')).toUpperCase();
  return {
    id: text(pick(r, 'id', 'dewormingId', 'deworming_id', 'lastId')),
    kind: kindOf(pick(r, 'kind', 'type')) ?? fallbackKind,
    product: text(r['product']),
    activeIngredient: text(pick(r, 'activeIngredient', 'active_ingredient')),
    dose: text(r['dose']),
    weightKg: num(pick(r, 'weightKg', 'weight_kg', 'weight')),
    applicationDate: isoDate(pick(r, 'applicationDate', 'application_date', 'lastApplicationDate', 'date')),
    nextDoseDate: isoDate(pick(r, 'nextDoseDate', 'next_dose_date', 'nextDue')),
    administeredBy: by === 'OWNER' || by === 'CLINIC' ? by : '',
    veterinaryName: text(pick(r, 'veterinaryName', 'veterinary_name', 'clinicName')),
    notes: text(r['notes']),
    voided: text(r['status']).toUpperCase() === 'ENTERED_IN_ERROR',
  };
}

/** Estado que dice el servidor ("UP_TO_DATE", "Por vencer", "OVERDUE"…), si lo dice. */
function serverState(s: Raw | null): PreventionState | null {
  const v = text(pick(s, 'state', 'status', 'prevention_status', 'preventionStatus', 'dueStatus')).toUpperCase().replace(/[\s-]+/g, '_');
  if (!v) return null;
  if (/OVERDUE|VENCID/.test(v)) return 'OVERDUE';
  if (/DUE_SOON|POR_VENCER/.test(v)) return 'DUE_SOON';
  if (/UP_TO_DATE|AL_D|^OK$|CURRENT|VIGENTE/.test(v)) return 'OK';
  if (/^NONE$|NOT_REGISTERED|SIN_REGISTRO|UNKNOWN/.test(v)) return 'NONE';
  return null;
}

/**
 * `GET /dewormings?petId=`: la última dosis por tipo (`{ dewormings: { INTERNAL: {...}, EXTERNAL: {...} } }`)
 * y, si el backend la manda, la lista de dosis anteriores. También acepta una lista plana de dosis.
 */
export function normalizeDewormings(res: unknown, today: string = todayIso()): DewormingOverview {
  const root = unwrap(res);
  const rootIsList = Array.isArray(root);
  const rootObj: Raw = isObj(root) ? root : {};
  const byKind: Raw = isObj(rootObj['dewormings']) ? rootObj['dewormings'] : isObj(rootObj['prevention']) ? rootObj['prevention'] : rootObj;

  const rawHistory: unknown[] = rootIsList
    ? (root as unknown[])
    : [rootObj['history'], rootObj['items'], rootObj['records'], Array.isArray(rootObj['dewormings']) ? rootObj['dewormings'] : null].find(Array.isArray) as unknown[] ?? [];
  const history = rawHistory
    .filter(isObj)
    .map(r => normalizeDewormingEntry(r))
    .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));

  const make = (kind: DewormingKind): DewormingKindStatus => {
    const s = isObj(byKind[kind]) ? (byKind[kind] as Raw) : isObj(byKind[kind.toLowerCase()]) ? (byKind[kind.toLowerCase()] as Raw) : null;
    const own = history.filter(h => h.kind === kind && !h.voided);
    const fromList = own[0] ?? null;
    const lastApplicationDate = isoDate(pick(s, 'lastApplicationDate', 'last_application_date', 'applicationDate')) || fromList?.applicationDate || '';
    const registered = s && s['registered'] === false ? false : !!(s?.['registered'] || lastApplicationDate);
    const last: DewormingEntry | null = s && (s['id'] || s['product'] || s['lastId']) ? normalizeDewormingEntry(s, kind) : fromList;
    const nextDoseDate = isoDate(pick(s, 'nextDoseDate', 'next_dose_date', 'nextDue')) || fromList?.nextDoseDate || last?.nextDoseDate || '';
    const state: PreventionState = !registered ? 'NONE' : nextDoseDate ? stateFromDate(nextDoseDate, today) : serverState(s) ?? 'OK';
    return { kind, registered, last, lastApplicationDate, nextDoseDate, state, nextSuggested: false };
  };

  return { INTERNAL: make('INTERNAL'), EXTERNAL: make('EXTERNAL'), history };
}

/**
 * Si el backend no trae la próxima dosis, la propone según la edad de la mascota
 * (queda marcada como sugerida y el estado se recalcula con esa fecha).
 */
export function withSuggestedNext(status: DewormingKindStatus, birthDate: string, today: string = todayIso()): DewormingKindStatus {
  if (!status.registered || status.nextDoseDate || !status.lastApplicationDate) return status;
  const next = suggestNextDose(status.kind, birthDate, status.lastApplicationDate);
  return { ...status, nextDoseDate: next, nextSuggested: true, state: stateFromDate(next, today) };
}

// ---------------------------------------------------------------- Alergias

export const ALLERGY_CATEGORIES: AllergyCategory[] = ['DRUG', 'FOOD', 'ENVIRONMENT', 'OTHER'];
export const ALLERGY_SEVERITIES: AllergySeverity[] = ['MILD', 'MODERATE', 'SEVERE'];

export function allergyCategoryLabel(c: AllergyCategory): string {
  switch (c) {
    case 'DRUG': return 'Medicamento';
    case 'FOOD': return 'Alimento';
    case 'ENVIRONMENT': return 'Ambiente';
    default: return 'Otro';
  }
}

export function allergySeverityLabel(s: AllergySeverity): string {
  return s === 'SEVERE' ? 'Grave' : s === 'MODERATE' ? 'Moderada' : 'Leve';
}

export function isActiveAllergy(a: Allergy): boolean {
  return a.state === 'SUSPECTED' || a.state === 'CONFIRMED';
}

/** Para ordenar: primero las graves. */
export function severityRank(s: AllergySeverity): number {
  return s === 'SEVERE' ? 0 : s === 'MODERATE' ? 1 : 2;
}

/** "Declarada por ti" / "Confirmada por Dra. Ruiz" / "Registrada por Clínica Patitas". */
export function allergyOrigin(a: Allergy): string {
  if (a.state === 'CONFIRMED') return a.veterinaryName ? `Confirmada por ${a.veterinaryName}` : 'Confirmada por una clínica';
  if (a.source === 'CLINIC') return a.veterinaryName ? `Registrada por ${a.veterinaryName}` : 'Registrada por una clínica';
  return 'Declarada por ti';
}

export function allergyStatusLabel(s: AllergyStatus): string {
  return s === 'HAS_ALLERGIES' ? 'Tiene alergias' : s === 'NONE_KNOWN' ? 'Sin alergias conocidas' : 'Sin preguntar';
}

const categoryOf = (v: unknown): AllergyCategory => {
  const s = text(v).toUpperCase();
  return (ALLERGY_CATEGORIES as string[]).includes(s) ? (s as AllergyCategory) : 'OTHER';
};
const severityOf = (v: unknown): AllergySeverity => {
  const s = text(v).toUpperCase();
  return (ALLERGY_SEVERITIES as string[]).includes(s) ? (s as AllergySeverity) : 'MILD';
};
const stateOf = (v: unknown): AllergyState => {
  const s = text(v).toUpperCase();
  return s === 'CONFIRMED' || s === 'RESOLVED' || s === 'ENTERED_IN_ERROR' ? s : 'SUSPECTED';
};

export function normalizeAllergy(r: Raw | string): Allergy {
  if (typeof r === 'string') {
    return { id: '', allergen: r, category: 'OTHER', severity: 'MILD', reaction: '', state: 'SUSPECTED', source: '', veterinaryName: '', recordedAt: '', notes: '' };
  }
  const source = text(pick(r, 'source', 'origin')).toUpperCase();
  return {
    id: text(r['id']),
    allergen: text(pick(r, 'allergen', 'name')),
    category: categoryOf(r['category']),
    severity: severityOf(r['severity']),
    reaction: text(r['reaction']),
    state: stateOf(r['status']),
    source: source === 'OWNER' || source === 'CLINIC' ? source : '',
    veterinaryName: text(pick(r, 'veterinaryName', 'veterinary_name', 'confirmedByName', 'confirmed_by_name')),
    recordedAt: isoDate(pick(r, 'recordedAt', 'recorded_at', 'createdAt', 'created_at')),
    notes: text(r['notes']),
  };
}

const allergyStatusOf = (v: unknown, list: Allergy[]): AllergyStatus => {
  const s = text(v).toUpperCase();
  if (s === 'UNKNOWN' || s === 'NONE_KNOWN' || s === 'HAS_ALLERGIES') return s;
  return list.some(isActiveAllergy) ? 'HAS_ALLERGIES' : 'UNKNOWN';
};

function allergyList(raw: unknown): Allergy[] {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .filter(x => isObj(x) || typeof x === 'string')
    .map(x => normalizeAllergy(x as Raw | string))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

/** `GET /allergies?petId=` → `{ allergyStatus, allergies: [...] }`. */
export function normalizeAllergies(res: unknown): AllergyOverview {
  const root = unwrap(res);
  const obj: Raw = isObj(root) ? root : {};
  const allergies = allergyList(Array.isArray(root) ? root : obj['allergies'] ?? obj['items']);
  return { allergyStatus: allergyStatusOf(obj['allergyStatus'] ?? obj['allergy_status'], allergies), allergies };
}

// ---------------------------------------------------------------- Esterilización

export function normalizeNeutered(raw: unknown): Neutered {
  const none: Neutered = { status: 'UNKNOWN', at: '', source: '', confirmed: false, confirmedByName: '' };
  if (typeof raw === 'string' || typeof raw === 'boolean') {
    const s = typeof raw === 'boolean' ? (raw ? 'YES' : 'NO') : raw.toUpperCase();
    return { ...none, status: s === 'YES' || s === 'NO' ? s : 'UNKNOWN' };
  }
  if (!isObj(raw)) return none;
  const flag = pick(raw, 'status', 'neuteredStatus', 'neutered_status');
  const s = typeof flag === 'boolean' ? (flag ? 'YES' : 'NO') : text(flag).toUpperCase();
  const source = text(pick(raw, 'source', 'neuteredSource', 'neutered_source')).toUpperCase();
  const confirmedBy = pick(raw, 'confirmedByEmployeeId', 'confirmed_by_employee_id', 'confirmedBy', 'neuteredConfirmedBy', 'confirmedAt');
  return {
    status: (s === 'YES' || s === 'NO' ? s : 'UNKNOWN') as NeuteredStatus,
    at: isoDate(pick(raw, 'at', 'neuteredAt', 'neutered_at', 'date', 'neuteredDate')),
    source: source === 'OWNER' || source === 'CLINIC' ? source : '',
    confirmed: !!confirmedBy || raw['confirmed'] === true,
    confirmedByName: text(pick(raw, 'confirmedByName', 'confirmed_by_name', 'veterinaryName')),
  };
}

export function neuteredLabel(n: Neutered): string {
  if (n.status === 'YES') return n.at ? `Sí · desde ${healthMonthYear(n.at)}` : 'Sí';
  if (n.status === 'NO') return 'No';
  return 'Sin confirmar';
}

export function neuteredOrigin(n: Neutered): string {
  if (n.status === 'UNKNOWN') return '';
  if (n.confirmed) return n.confirmedByName ? `Confirmado por ${n.confirmedByName}` : 'Confirmado por una clínica';
  return 'Declarado por ti';
}

// ---------------------------------------------------------------- Resumen del perfil

/** `GET /pets/{id}/clinical-summary` → `{ data: { allergies, neutered, prevention } }`. */
export function normalizeSummary(res: unknown, today: string = todayIso()): HealthSummary {
  const root = unwrap(res);
  const obj: Raw = isObj(root) ? root : {};
  const allergies = allergyList(obj['allergies']);
  const prev = normalizeDewormings({ dewormings: isObj(obj['prevention']) ? obj['prevention'] : {} }, today);
  return {
    neutered: normalizeNeutered(obj['neutered']),
    allergyStatus: allergyStatusOf(obj['allergyStatus'] ?? obj['allergy_status'], allergies),
    allergies,
    prevention: { INTERNAL: prev.INTERNAL, EXTERNAL: prev.EXTERNAL },
  };
}

// ---------------------------------------------------------------- Errores

const KNOWN_CODES: HealthErrorCode[] = [
  'ACTIVE_ALLERGIES_EXIST', 'OWNER_CANNOT_CONFIRM', 'REASON_REQUIRED', 'VALIDATION_ERROR', 'PET_NOT_OWNED', 'NO_ACCESS_TO_PET',
];

/** Convierte un `HttpErrorResponse` en un `HealthError` con código estable. */
export function parseHealthError(err: any): HealthError {
  const status: number = err?.status ?? 0;
  const body = err?.error;
  const rawCode = isObj(body) ? body['code'] ?? body['errorCode'] : undefined;
  const message: string = (isObj(body) ? body['message'] ?? body['error'] : undefined) ?? err?.message ?? '';

  let code: HealthErrorCode;
  if (KNOWN_CODES.includes(rawCode)) code = rawCode;
  else if (status === 0) code = 'NETWORK';
  // Sin código de negocio, un 404/405/501/5xx es que la ruta todavía no está publicada en el gateway o el servicio no responde.
  else if (status === 404 || status === 405 || status === 501 || status === 502 || status === 503 || status === 504) code = 'NOT_AVAILABLE';
  else code = 'UNKNOWN';
  return { code, status, message };
}

/** Texto para el usuario según el error. */
export function healthErrorText(e: HealthError): string {
  switch (e.code) {
    case 'ACTIVE_ALLERGIES_EXIST': return 'Tiene alergias vigentes. Quítalas o márcalas como resueltas antes de indicar que no tiene.';
    case 'OWNER_CANNOT_CONFIRM': return 'Solo un veterinario puede confirmar una alergia.';
    case 'REASON_REQUIRED': return 'Escribe el motivo del cambio.';
    case 'VALIDATION_ERROR': return 'Revisa los datos: la fecha no puede ser futura ni anterior al nacimiento.';
    case 'PET_NOT_OWNED':
    case 'NO_ACCESS_TO_PET': return 'No tienes permiso para registrar datos de esta mascota.';
    case 'NOT_AVAILABLE': return 'Esta sección todavía no está disponible. Intenta de nuevo más tarde.';
    case 'NETWORK': return 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.';
    default: return 'Algo salió mal. Intenta de nuevo en un momento.';
  }
}
