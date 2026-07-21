import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { PetForm } from '../../add-pet.component';

export const VACCINE_TYPES = [
  'Rabia', 'Moquillo', 'Parvovirus', 'Hepatitis', 'Leptospirosis',
  'Bordetella', 'Leucemia felina', 'Calicivirus', 'Panleucopenia', 'Otra'
];

@Component({
  selector: 'app-step-medical',
  templateUrl: './step-medical.component.html',
  styleUrls: ['./step-medical.component.scss'],
  standalone: false
})
export class StepMedicalComponent implements OnInit {
  @Input() data!: PetForm;
  @Output() dataChange = new EventEmitter<Partial<PetForm>>();
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  vaccineTypes = VACCINE_TYPES;
  selectedVaccineType = '';
  vaccineDate = '';
  showVaccineTypeDropdown = false;
  nextVaccineDate = '';
  selectedFile: File | null = null;
  selectedFileName = '';
  vetName = '';
  showOptionalNote = true;

  constructor(private router: Router) {}

  ngOnInit() {
    this.selectedVaccineType = this.data.vaccine?.type || '';
    this.vaccineDate         = this.data.vaccine?.date || '';
    this.vetName             = this.data.vetName       || '';
    if (this.vaccineDate) this.calcNextVaccine();
  }

  toggleVaccineDropdown() {
    this.showVaccineTypeDropdown = !this.showVaccineTypeDropdown;
  }


  selectVaccineType(type: string) {
    this.selectedVaccineType = type;
    this.showVaccineTypeDropdown = false;
    this.emit();
  }

  onVaccineDateChange() {
    this.calcNextVaccine();
    this.emit();
  }

  calcNextVaccine() {
    if (!this.vaccineDate) return;
    const d = new Date(this.vaccineDate);
    d.setFullYear(d.getFullYear() + 1);
    this.nextVaccineDate = d.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  // SUBIR DOCUMENTO — abre el input oculto
  openFileInput() {
    this.fileInput?.nativeElement?.click();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.selectedFile     = file;
    this.selectedFileName = file.name;
    this.emit();
  }

  removeFile() {
    this.selectedFile     = null;
    this.selectedFileName = '';
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    this.emit();
  }

  // AGENDAR CITA — redirige a crear evento
  agendarCita() {
    this.router.navigate(['/calendar/add']);
  }

  // ASOCIAR VETERINARIA — redirige a vista futura
  asociarVeterinaria() {
    this.router.navigate(['/veterinarias']);
  }

  emit() {
    this.dataChange.emit({
      vaccine: this.selectedVaccineType
        ? { type: this.selectedVaccineType, date: this.vaccineDate }
        : null,
      document: this.selectedFile,
      vetName:  this.vetName,
    });
  }

  goToRegisterVaccine() {
  this.router.navigate(['/register-vaccine']);
}

}