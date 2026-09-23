import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MedicalHistoryService } from 'src/app/services/MedicalHistoryService/medical-history';
import { PetService } from 'src/app/services/PetService/pet';

@Component({
  selector: 'app-add-consultation',
  templateUrl: './add-consultation.page.html',
  styleUrls: ['./add-consultation.page.scss'],
  standalone: false
})
export class AddConsultationPage implements OnInit {

  petId: string = '';
  petName = '';
  petAvatar: string | null = null;

  visitDate = '';
  vet = '';
  reason = '';
  temperature = '';
  weight = '';
  diagnosis = '';
  notes = '';

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
    if (this.petId) {
      this.petService.getPetById(this.petId).subscribe({
        next: (pet) => {
          this.petName = pet.name;
          this.petAvatar = pet.imageUrl;
        },
        error: (err) => console.error('❌ Error cargando mascota:', err)
      });
    }
  }

  save() {
    if (this.saving || !this.petId) return;
    if (!this.visitDate || !this.reason) {
      alert('Fecha y motivo de la visita son obligatorios.');
      return;
    }

    this.saving = true;

    const payload = {
      petId: this.petId,
      date: this.visitDate,
      reason: this.reason,
      veterinarian: this.vet,
      diagnosis: this.diagnosis || undefined,
      notes: this.notes || undefined,
      weight: this.weight ? parseFloat(this.weight) : undefined,
      temperature: this.temperature ? parseFloat(this.temperature) : undefined,
    };

    this.medicalHistoryService.createVisit(payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/medical-history', this.petId], { replaceUrl: true });
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Error guardando consulta:', err);
        alert('No se pudo guardar la consulta. Intenta de nuevo.');
      }
    });
  }

  cancel() { this.location.back(); }
  goBack() { this.location.back(); }
}