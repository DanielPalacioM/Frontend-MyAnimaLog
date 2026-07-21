import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-consultation',
  templateUrl: './add-consultation.page.html',
  styleUrls: ['./add-consultation.page.scss'],
  standalone: false
})
export class AddConsultationPage {

  petName = 'Juan';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  visitDate = '';
  vet = '';
  reason = '';
  temperature = '';
  weight = '';
  diagnosis = '';
  notes = '';

  constructor(private router: Router) {}

  save() {
    console.log('Guardar consulta:', {
      visitDate: this.visitDate,
      vet: this.vet,
      reason: this.reason,
      temperature: this.temperature,
      weight: this.weight,
      diagnosis: this.diagnosis,
      notes: this.notes,
    });
    // TODO: ConsultationService.create(...)
    history.back();
  }

  cancel() { history.back(); }
  goBack() { history.back(); }
}