export type VaccineStatus = 'applied' | 'pending' | 'late' | 'suggested';

export interface Vaccine {
  id: string;
  petId: string;
  name: string;
  lotNumber: string;
  applicationDate: string;
  nextDoseDate?: string;
  veterinarian: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}