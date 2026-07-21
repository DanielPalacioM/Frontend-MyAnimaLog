import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-vaccine',
  templateUrl: './register-vaccine.component.html',
  styleUrls: ['./register-vaccine.component.scss'],
  standalone: false
})
export class RegisterVaccineComponent implements OnInit {

  // Mascota (mock por ahora)
  petName = 'Milo';
  petAge = '5 meses';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  // Campos vacuna
  vaccineType = '';
  description = '';
  appliedDate = '';
  lotId = '';
  nextDoseDate = '';
  attachedFile: File | null = null;
  attachedFileName = '';
  attachedFileSize = '';

  // Agendar cita
  scheduleAppointment = true;
  reminderActive = true;
  suggestedDate = '';
  motivo = '';
  vetName = 'Dr.pet - Cartagena';

  // Tipos de vacuna
  vaccineTypes = [
    'Rabia', 'Moquillo', 'Parvovirus', 'Hepatitis',
    'Leptospirosis', 'Bordetella', 'Leucemia felina',
    'Calicivirus', 'Panleucopenia', 'Otra'
  ];
  showVaccineDropdown = false;

  constructor(private router: Router) {}

  ngOnInit() {}

  selectVaccineType(type: string) {
    this.vaccineType = type;
    this.showVaccineDropdown = false;
    this.calcNextDose();
    this.motivo = `Refuerzo ${type}`;
  }

  calcNextDose() {
    if (!this.appliedDate) return;
    const d = new Date(this.appliedDate);
    d.setFullYear(d.getFullYear() + 1);
    this.nextDoseDate = d.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase();
    this.suggestedDate = d.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  onDateChange() {
    this.calcNextDose();
  }

  onFileSelected(event: Event, type: 'foto' | 'galeria' | 'pdf') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.attachedFile = file;
    this.attachedFileName = file.name;
    const kb = Math.round(file.size / 1024);
    this.attachedFileSize = `${kb} KB - subido`;
  }

  removeFile() {
    this.attachedFile = null;
    this.attachedFileName = '';
    this.attachedFileSize = '';
  }

  save() {
    console.log('Guardar vacuna:', {
      vaccineType: this.vaccineType,
      description: this.description,
      appliedDate: this.appliedDate,
      lotId: this.lotId,
      nextDoseDate: this.nextDoseDate,
      scheduleAppointment: this.scheduleAppointment,
      reminderActive: this.reminderActive,
    });
    // TODO: VaccineService.create(...)
    this.router.navigate(['/home']);
  }

  cancel() {
  history.back();
}

  delete() {
    // TODO: VaccineService.delete(...)
    this.router.navigate(['/home']);
  }

  goBack() {
    history.back();
  }
}