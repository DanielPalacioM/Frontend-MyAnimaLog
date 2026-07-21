import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  status: 'active' | 'inactive';
}

@Component({
  selector: 'app-add-treatment',
  templateUrl: './add-treatment.page.html',
  styleUrls: ['./add-treatment.page.scss'],
  standalone: false
})
export class AddTreatmentPage {

  petName = 'Juan';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  description = '';
  startDate = '';
  endDate = '';
  notes = '';
  status: 'active' | 'completed' | 'suspended' = 'active';

  medications: Medication[] = [];

  // Modal agregar medicamento
  showMedModal = false;
  newMedName = '';
  newMedDose = '';
  newMedFrequency = '';
  newMedRoute = '';

  statusOptions = [
    { key: 'active',     label: 'Activo' },
    { key: 'completed',  label: 'Completado' },
    { key: 'suspended',  label: 'Suspendido' },
  ];

  constructor(private router: Router) {}

  openMedModal() { this.showMedModal = true; }

  closeMedModal() {
    this.showMedModal = false;
    this.newMedName = '';
    this.newMedDose = '';
    this.newMedFrequency = '';
    this.newMedRoute = '';
  }

  addMedication() {
    if (!this.newMedName) return;
    this.medications.push({
      name: this.newMedName,
      dose: this.newMedDose,
      frequency: this.newMedFrequency,
      route: this.newMedRoute,
      status: 'active'
    });
    this.closeMedModal();
  }

  removeMedication(index: number) {
    this.medications.splice(index, 1);
  }

  setStatus(key: string) {
  this.status = key as 'active' | 'completed' | 'suspended';
}

  save() {
    console.log('Guardar tratamiento:', {
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      notes: this.notes,
      status: this.status,
      medications: this.medications,
    });
    // TODO: TreatmentService.create(...)
    history.back();
  }

  cancel() { history.back(); }
  goBack() { history.back(); }
}