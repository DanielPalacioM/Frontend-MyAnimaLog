import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MedicalHistoryService } from 'src/app/services/MedicalHistoryService/medical-history';
import { PetService } from 'src/app/services/PetService/pet';
import { Visit, SurgeryStatus, SurgeryOutcome } from 'src/app/models/medical-history.model';

type OutcomeType = 'successful' | 'partial' | 'complicated';
type ComplicationType = 'none' | 'bleeding' | 'reaction' | 'other';

@Component({
  selector: 'app-add-surgery',
  templateUrl: './add-surgery.page.html',
  styleUrls: ['./add-surgery.page.scss'],
  standalone: false
})
export class AddSurgeryPage implements OnInit {

  petId: string = '';
  petName = '';
  petAvatar: string | null = null;

  visits: Visit[] = [];
  selectedVisitId: string = '';

  currentStep = 1;
  totalSteps = 4;

  // Step 1 - Info básica
  title = '';
  description = '';
  surgeryDate = '';
  durationMinutes: number | null = null;
  anesthesia = '';

  // Step 2 - Procedimiento (solo UI local, no se envía al backend todavía)
  complication: ComplicationType = 'none';
  complicationDetail = '';

  // Step 3 - Recuperación
  postOpInstructions = '';

  // Step 4 - Estado
  status: SurgeryStatus = 'SCHEDULED';
  outcome: OutcomeType = 'successful';

  saving = false;

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

  statusOptions: { key: SurgeryStatus; label: string }[] = [
    { key: 'SCHEDULED',   label: 'Programada' },
    { key: 'IN_PROGRESS', label: 'En progreso' },
    { key: 'COMPLETED',   label: 'Completada' },
    { key: 'CANCELLED',   label: 'Cancelada' },
  ];

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

  goNext() { if (this.currentStep < this.totalSteps) this.currentStep++; }
  goPrev() { if (this.currentStep > 1) this.currentStep--; }

  setComplication(c: ComplicationType) { this.complication = c; }
  setStatus(s: SurgeryStatus) { this.status = s; }

  get progressPercent(): number {
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  get statusLabel(): string {
    return this.statusOptions.find(s => s.key === this.status)?.label || '';
  }

  save() {
    if (this.saving) return;
    if (!this.selectedVisitId) {
      alert('Selecciona a qué consulta pertenece esta cirugía.');
      return;
    }
    if (!this.title || !this.surgeryDate) {
      alert('Título y fecha de cirugía son obligatorios.');
      return;
    }

    this.saving = true;

    const payload = {
      petId: this.petId,
      veterinaryVisitId: this.selectedVisitId,
      title: this.title,
      description: this.description,
      surgeryDate: this.surgeryDate,
      durationMinutes: this.durationMinutes ?? 0,
      anesthesiaUsed: this.anesthesia,
      postOpInstructions: this.postOpInstructions,
    };

    this.medicalHistoryService.createSurgery(payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/medical-history', this.petId], { queryParams: { tab: 'cirugias' } });
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Error guardando cirugía:', err);
        alert('No se pudo guardar la cirugía. Intenta de nuevo.');
      }
    });
  }

  cancel() { this.location.back(); }
  goBack() {
    if (this.currentStep > 1) this.goPrev();
    else this.location.back();
  }

  
}