export interface Visit {
  id: string;
  petId: string;
  date: string;
  reason: string;
  veterinarian: string;
  diagnosis?: string;
  notes?: string;
  weight?: number;
  temperature?: number;
}

export interface Treatment {
  id: string;
  visitId: string;
  description: string;
  startDate: string;
  endDate: string;
  notes?: string;
  medications?: Medication[];
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface LabResult {
  id: string;
  visitId?: string;
  visit_id?: string;
  name: string;
  result: string;
  normal_range: string;
  date: string;
  notes?: string;
  isNormal?: boolean;
  created_at?: string;
}

export type SurgeryStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SurgeryOutcome = 'SUCCESSFUL' | 'COMPLICATIONS' | 'UNSUCCESSFUL';

export interface Surgery {
  id: string;
  petId: string;
  veterinaryVisitId: string;
  title: string;
  description: string;
  surgeryDate: string;
  durationMinutes: number;
  anesthesiaUsed: string;
  postOpInstructions: string;
  status?: SurgeryStatus;
  outcome?: SurgeryOutcome;
}