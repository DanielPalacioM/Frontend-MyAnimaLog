import { Component } from '@angular/core';
import { Router } from '@angular/router';

type SurgeryStatus = 'completed' | 'recovery' | 'scheduled';
type OutcomeType = 'successful' | 'partial' | 'complicated';
type ComplicationType = 'none' | 'bleeding' | 'reaction' | 'other';

@Component({
  selector: 'app-add-surgery',
  templateUrl: './add-surgery.page.html',
  styleUrls: ['./add-surgery.page.scss'],
  standalone: false
})
export class AddSurgeryPage {

  petName = 'Juan';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  currentStep = 1;
  totalSteps = 4;

  // Step 1 - Info básica
  title = '';
  description = '';
  surgeryDate = '';
  durationMinutes: number | null = null;
  vet = '';
  anesthesia = '';

  // Step 2 - Procedimiento
  complication: ComplicationType = 'none';
  complicationDetail = '';

  // Step 3 - Recuperación
  outcome: OutcomeType = 'successful';
  outcomeDetail = '';
  postOpInstructions = '';
  nextCheckupDate = '';

  // Step 4 - Estado
  status: SurgeryStatus = 'completed';

  stepTitles = ['Info', 'Proced.', 'Recup.', 'Estado'];

  stepIcons = [
    'assets/images/MH/InfoBasicaCirugias.png',
    'assets/images/MH/DetallesProcedimiento.png',
    'assets/images/MH/Recuperacion.png',
    'assets/images/MH/EstadoCirugia.png',
  ];

  complicationOptions: { key: ComplicationType; label: string }[] = [
    { key: 'none',      label: 'Ninguna' },
    { key: 'bleeding',  label: 'Sangrado' },
    { key: 'reaction',  label: 'Reacción' },
    { key: 'other',     label: 'Otra' },
  ];

  outcomeOptions: { key: OutcomeType; label: string }[] = [
    { key: 'successful',  label: 'Exitosa' },
    { key: 'partial',     label: 'Parcial' },
    { key: 'complicated', label: 'Con compl.' },
  ];

  statusOptions: { key: SurgeryStatus; label: string }[] = [
    { key: 'completed', label: 'Completada' },
    { key: 'recovery',  label: 'En recuperación' },
    { key: 'scheduled', label: 'Programada' },
  ];

  constructor(private router: Router) {}

  goNext() { if (this.currentStep < this.totalSteps) this.currentStep++; }
  goPrev() { if (this.currentStep > 1) this.currentStep--; }

  setComplication(c: ComplicationType) { this.complication = c; }
  setOutcome(o: OutcomeType) { this.outcome = o; }
  setStatus(s: SurgeryStatus) { this.status = s; }

  get progressPercent(): number {
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  get outcomeLabel(): string {
    return this.outcomeOptions.find(o => o.key === this.outcome)?.label || '';
  }

  get statusLabel(): string {
    return this.statusOptions.find(s => s.key === this.status)?.label || '';
  }

  save() {
    console.log('Guardar cirugía:', {
      title: this.title,
      description: this.description,
      surgeryDate: this.surgeryDate,
      durationMinutes: this.durationMinutes,
      vet: this.vet,
      anesthesia: this.anesthesia,
      complication: this.complication,
      complicationDetail: this.complicationDetail,
      outcome: this.outcome,
      outcomeDetail: this.outcomeDetail,
      postOpInstructions: this.postOpInstructions,
      nextCheckupDate: this.nextCheckupDate,
      status: this.status,
    });
    // TODO: SurgeryService.create(...)
    history.back();
  }

  cancel() { history.back(); }
  goBack() {
    if (this.currentStep > 1) this.goPrev();
    else history.back();
  }
}