import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

export type MHTab = 'consultas' | 'tratamientos' | 'lab' | 'cirugias';

export interface Consultation {
  id: string;
  title: string;
  date: string;
  vet: string;
  reason: string;
  temperature?: string;
  weight?: string;
  status: 'applied' | 'follow-up';
  hasDoc?: boolean;
  hasTreatment?: boolean;
}

export interface Treatment {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  notes?: string;
  status: 'active' | 'completed' | 'suspended';
  progressDays: number;
  totalDays: number;
  medications: { name: string; dose: string; status: string }[];
}

export interface LabTest {
  id: string;
  title: string;
  date: string;
  lab: string;
  isNormal: boolean;
  resultMessage: string;
  values?: { label: string; value: string; range: string }[];
  hasDoc?: boolean;
  status: 'active' | 'review';
}

export interface Surgery {
  id: string;
  title: string;
  date: string;
  vet: string;
  durationMin: number;
  anesthesia: string;
  complications: string;
  nextCheckup: string;
  outcome: string;
  status: 'completed' | 'recovery' | 'scheduled';
}

@Component({
  selector: 'app-medical-history',
  templateUrl: './medical-history.page.html',
  styleUrls: ['./medical-history.page.scss'],
  standalone: false
})
export class MedicalHistoryPage implements OnInit {

  activeTab: MHTab = 'consultas';

  petName = 'Juan';
  petBreed = 'Siamés';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  consultations: Consultation[] = [
    {
      id: 'c1', title: 'Chequeo general',
      date: '12 jun 2026', vet: 'Dr.pet',
      reason: 'Revisión rutinaria',
      temperature: '38.5°C', weight: '40 Kg',
      status: 'applied', hasDoc: true, hasTreatment: true
    },
    {
      id: 'c2', title: 'Consulta digestiva',
      date: '12 feb 2026', vet: 'Dr.pet',
      reason: 'Vómitos frecuentes',
      status: 'follow-up'
    },
  ];

  treatments: Treatment[] = [
    {
      id: 't1', title: 'Tratamiento digestivo',
      startDate: '3 abr', endDate: '10 abr 2026',
      description: 'Gastritis leve', notes: 'Dieta blanda',
      status: 'active', progressDays: 5, totalDays: 7,
      medications: [{ name: 'Omeprazol 20mg', dose: '1 caps · c/12h · Oral', status: 'active' }]
    },
    {
      id: 't2', title: 'Post - Vacuna',
      startDate: '', endDate: 'ene 2024',
      description: '', status: 'completed',
      progressDays: 7, totalDays: 7, medications: []
    },
  ];

  labTests: LabTest[] = [
    {
      id: 'l1', title: 'Hemograma',
      date: '10 jun 2024', lab: 'Lab·Dr.pet',
      isNormal: true, resultMessage: 'Resultados normales',
      status: 'active', hasDoc: true,
      values: [
        { label: 'Glóbulos', value: '6.2', range: '5.5–8.5' },
        { label: 'Plaquetas', value: '320k', range: '200–500k' },
        { label: 'Hematocrito', value: '42%', range: '37–55%' },
      ]
    },
    {
      id: 'l2', title: 'Rayos X tórax',
      date: '3 abr 2024', lab: '',
      isNormal: false, resultMessage: 'Leve opacidad lóbulo derecho',
      status: 'review'
    },
  ];

  surgeries: Surgery[] = [
    {
      id: 's1', title: 'Castración',
      date: '3 jul 2026', vet: 'Dr. Pet - Cartagena',
      durationMin: 45, anesthesia: 'Ketamina + Xilazina',
      complications: 'Ninguna', nextCheckup: '10 jul 2026',
      outcome: 'Exitosa', status: 'completed'
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  setTab(tab: MHTab) { this.activeTab = tab; }

  get progressPercent(): number {
    const t = this.treatments.find(x => x.status === 'active');
    return t ? Math.round((t.progressDays / t.totalDays) * 100) : 0;
  }

goToAddConsultation() { this.router.navigate(['/add-consultation']); }
goToAddTreatment() { this.router.navigate(['/add-treatment']); }
goToAddLab() { this.router.navigate(['/add-lab']); }
goToAddSurgery() { this.router.navigate(['/add-surgery']); }
goBack() { history.back(); }

}
