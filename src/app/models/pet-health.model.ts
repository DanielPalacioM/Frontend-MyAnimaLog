// Salud de la mascota que el dueño registra: desparasitación, alergias y esterilización (servicio Medical).
// Contrato: docs/DATOS_MASCOTA_CLINICA.md y carpeta D9 de la colección "Medical Pet Backend · Dueño y Veterinaria".

// ---------- Desparasitación ----------

export type DewormingKind = 'INTERNAL' | 'EXTERNAL';

/** Mismo lenguaje de estados que las vacunas: Al día, Por vencer, Vencida, Sin registro. */
export type PreventionState = 'OK' | 'DUE_SOON' | 'OVERDUE' | 'NONE';

export interface DewormingEntry {
  id: string;
  kind: DewormingKind;
  product: string;
  activeIngredient: string;
  dose: string;
  weightKg: number | null;
  /** YYYY-MM-DD */
  applicationDate: string;
  /** YYYY-MM-DD; vacía si no hay próxima dosis. */
  nextDoseDate: string;
  administeredBy: 'OWNER' | 'CLINIC' | '';
  veterinaryName: string;
  notes: string;
  /** Una dosis anulada ("ingresada por error") no cuenta. */
  voided: boolean;
}

export interface DewormingKindStatus {
  kind: DewormingKind;
  registered: boolean;
  /** Última dosis válida, si el backend la trae completa. */
  last: DewormingEntry | null;
  lastApplicationDate: string;
  nextDoseDate: string;
  /** La fecha no la dio el backend: la propone la app según la edad. */
  nextSuggested: boolean;
  state: PreventionState;
}

export interface DewormingOverview {
  INTERNAL: DewormingKindStatus;
  EXTERNAL: DewormingKindStatus;
  /** Dosis anteriores, de la más reciente a la más antigua (vacío si el backend solo devuelve la última por tipo). */
  history: DewormingEntry[];
}

export interface NewDeworming {
  petId: string;
  kind: DewormingKind;
  product: string;
  /** YYYY-MM-DD, no futura. */
  applicationDate: string;
  dose?: string;
  weightKg?: number;
  activeIngredient?: string;
  nextDoseDate?: string;
  notes?: string;
}

// ---------- Alergias ----------

export type AllergyCategory = 'DRUG' | 'FOOD' | 'ENVIRONMENT' | 'OTHER';
export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE';
/** `SUSPECTED` = declarada por el dueño; `CONFIRMED` = confirmada por un veterinario. */
export type AllergyState = 'SUSPECTED' | 'CONFIRMED' | 'RESOLVED' | 'ENTERED_IN_ERROR';
/** "No sé" no es "no tiene": `UNKNOWN` es distinto de `NONE_KNOWN`. */
export type AllergyStatus = 'UNKNOWN' | 'NONE_KNOWN' | 'HAS_ALLERGIES';

export interface Allergy {
  id: string;
  allergen: string;
  category: AllergyCategory;
  severity: AllergySeverity;
  reaction: string;
  state: AllergyState;
  source: 'OWNER' | 'CLINIC' | '';
  veterinaryName: string;
  recordedAt: string;
  notes: string;
}

export interface AllergyOverview {
  allergyStatus: AllergyStatus;
  allergies: Allergy[];
}

export interface NewAllergy {
  petId: string;
  allergen: string;
  category: AllergyCategory;
  severity: AllergySeverity;
  reaction?: string;
  notes?: string;
}

// ---------- Esterilización ----------

export type NeuteredStatus = 'YES' | 'NO' | 'UNKNOWN';

export interface Neutered {
  status: NeuteredStatus;
  /** YYYY-MM-DD o vacía. */
  at: string;
  source: 'OWNER' | 'CLINIC' | '';
  /** Confirmada por una clínica (la declaró el dueño pero un veterinario la verificó). */
  confirmed: boolean;
  confirmedByName: string;
}

// ---------- Resumen clínico (una sola consulta para el perfil) ----------

export interface HealthSummary {
  neutered: Neutered;
  allergyStatus: AllergyStatus;
  allergies: Allergy[];
  prevention: { INTERNAL: DewormingKindStatus; EXTERNAL: DewormingKindStatus };
}

// ---------- Errores ----------

export type HealthErrorCode =
  | 'ACTIVE_ALLERGIES_EXIST'
  | 'OWNER_CANNOT_CONFIRM'
  | 'REASON_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'PET_NOT_OWNED'
  | 'NO_ACCESS_TO_PET'
  | 'NOT_FOUND'
  /** El gateway todavía no enruta estas rutas, o el servicio no responde. */
  | 'NOT_AVAILABLE'
  | 'NETWORK'
  | 'UNKNOWN';

export interface HealthError {
  code: HealthErrorCode;
  status: number;
  message: string;
}
