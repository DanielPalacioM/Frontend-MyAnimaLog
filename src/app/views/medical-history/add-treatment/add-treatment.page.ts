import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MedicalHistoryService } from 'src/app/services/MedicalHistoryService/medical-history';
import { PetService } from 'src/app/services/PetService/pet';
import { Visit, Medication } from 'src/app/models/medical-history.model';

@Component({
  selector: 'app-add-treatment',
  templateUrl: './add-treatment.page.html',
  styleUrls: ['./add-treatment.page.scss'],
  standalone: false
})
export class AddTreatmentPage implements OnInit {

  petId: string = '';
  petName = '';
  petAvatar: string | null = null;

  visits: Visit[] = [];
  selectedVisitId: string = '';

  description = '';
  startDate = '';
  endDate = '';
  notes = '';

  medications: Medication[] = [];

  showMedModal = false;
  newMedName = '';
  newMedDose = '';
  newMedFrequency = '';
  newMedDuration = '';

  saving = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private medicalHistoryService: MedicalHistoryService,
    private petService: PetService
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    if (!this.petId) return;

    this.petService.getPetById(this.petId).subscribe({
      next: (pet) => {
        this.petName = pet.name;
        this.petAvatar = pet.imageUrl;
      },
      error: (err) => console.error('❌ Error cargando mascota:', err)
    });

    this.medicalHistoryService.getVisitsByPet(this.petId).subscribe({
      next: (visits) => {
        this.visits = visits;
        if (visits.length > 0) {
          this.selectedVisitId = visits[0].id;
        }
      },
      error: (err) => console.error('❌ Error cargando visitas:', err)
    });
  }

  openMedModal() { this.showMedModal = true; }

  closeMedModal() {
    this.showMedModal = false;
    this.newMedName = '';
    this.newMedDose = '';
    this.newMedFrequency = '';
    this.newMedDuration = '';
  }

  addMedication() {
    if (!this.newMedName) return;
    this.medications.push({
      name: this.newMedName,
      dosage: this.newMedDose,
      frequency: this.newMedFrequency,
      duration: this.newMedDuration
    });
    this.closeMedModal();
  }

  removeMedication(index: number) {
    this.medications.splice(index, 1);
  }

  save() {
    if (this.saving) return;
    if (!this.selectedVisitId) {
      alert('Selecciona a qué consulta pertenece este tratamiento.');
      return;
    }
    if (!this.description || !this.startDate || !this.endDate) {
      alert('Descripción, fecha de inicio y fecha de fin son obligatorias.');
      return;
    }

    this.saving = true;

    const payload = {
      visitId: this.selectedVisitId,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      notes: this.notes || undefined
    };

    this.medicalHistoryService.createTreatment(payload).subscribe({
      next: (treatment) => {
        console.log('🔍 Tratamiento creado, id recibido:', treatment.id, treatment);
        if (this.medications.length === 0) {
          this.saving = false;
          this.router.navigate(['/medical-history', this.petId]);
          return;
        }
        this.saveMedicationsSequentially(treatment.id, 0);
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Error guardando tratamiento:', err);
        alert('No se pudo guardar el tratamiento. Intenta de nuevo.');
      }
    });
  }

  private saveMedicationsSequentially(treatmentId: string, index: number) {
    if (index >= this.medications.length) {
      this.saving = false;
      this.router.navigate(['/medical-history', this.petId]);
      return;
    }

    this.medicalHistoryService.addMedicationToTreatment(treatmentId, this.medications[index]).subscribe({
      next: () => this.saveMedicationsSequentially(treatmentId, index + 1),
      error: (err) => {
        console.error(`❌ Error agregando medicamento ${index}:`, err);
        this.saveMedicationsSequentially(treatmentId, index + 1); // continúa con los demás aunque uno falle
      }
    });
  }

  cancel() { this.location.back(); }
  goBack() { this.location.back(); }
}