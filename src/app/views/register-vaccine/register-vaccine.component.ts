import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VaccineService } from 'src/app/services/VaccineService/vaccine/vaccine';
import { PetService } from 'src/app/services/PetService/pet';
import { NotificationService } from 'src/app/services/NotificationService/notification';

@Component({
  selector: 'app-register-vaccine',
  templateUrl: './register-vaccine.component.html',
  styleUrls: ['./register-vaccine.component.scss'],
  standalone: false
})
export class RegisterVaccineComponent implements OnInit {

  petId = '';
  petName = '';
  petAge = '';
  petAvatar: string | null = null;

  // Campos vacuna
  vaccineType = '';
  description = '';
  appliedDate = '';
  lotId = '';
  nextDoseDate = '';
  attachedFile: File | null = null;
  attachedFileName = '';
  attachedFileSize = '';

  // Agendar cita (UI local por ahora — no hay servicio de calendario todavía)
  scheduleAppointment = true;
  reminderActive = true;
  suggestedDate = '';
  motivo = '';
  vetName = '';

  saving = false;

  vaccineTypes = [
    'Rabia', 'Moquillo', 'Parvovirus', 'Hepatitis',
    'Leptospirosis', 'Bordetella', 'Leucemia felina',
    'Calicivirus', 'Panleucopenia', 'Otra'
  ];
  showVaccineDropdown = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vaccineService: VaccineService,
    private petService: PetService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.queryParamMap.get('petId') || '';
    if (!this.petId) {
      console.error('❌ No se recibió petId para registrar la vacuna');
      return;
    }
    this.loadPetInfo();
  }

  private loadPetInfo() {
    this.petService.getPetById(this.petId).subscribe({
      next: (pet) => {
        this.petName = pet.name;
        this.petAvatar = pet.imageUrl;
        this.petAge = pet.ageMonths != null
          ? (pet.ageMonths < 12 ? `${pet.ageMonths} meses` : `${Math.floor(pet.ageMonths / 12)} años`)
          : '—';
      },
      error: (err) => console.error('❌ Error cargando mascota:', err)
    });
  }

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
    this.nextDoseDate = d.toISOString().split('T')[0]; // formato ISO para enviar al backend
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
    if (this.saving) return;

    if (!this.vaccineType || !this.appliedDate) {
      alert('Selecciona el tipo de vacuna y la fecha de aplicación.');
      return;
    }

    this.saving = true;

    const payload = {
      petId: this.petId,
      name: this.vaccineType,
      lotNumber: this.lotId,
      applicationDate: new Date(this.appliedDate).toISOString(),
      nextDoseDate: this.nextDoseDate ? new Date(this.nextDoseDate).toISOString() : undefined,
      veterinarian: this.vetName,
      notes: this.description,
    };

    this.vaccineService.createVaccine(payload).subscribe({
      next: (vaccine) => {
        console.log('✅ Vacuna registrada exitosamente:', vaccine);
        this.notifyVaccineRegistered();
        this.saving = false;
        this.router.navigate(['/vaccine-timeline'], { queryParams: { petId: this.petId }, replaceUrl: true });
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Error registrando vacuna:', err);
        alert('No se pudo registrar la vacuna. Intenta de nuevo.');
      }
    });
  }

  // El backend de vacunas solo programa el recordatorio de la próxima dosis
  // (VACCINE_DUE); no manda una confirmación de que se registró. Se crea acá
  // para que el dueño vea de una vez el "estado" de la vacuna en Notificaciones.
  private notifyVaccineRegistered(): void {
    const petLabel = this.petName || 'Tu mascota';
    const nextDoseLabel = this.nextDoseDate
      ? ` Próxima dosis: ${new Date(this.nextDoseDate).toLocaleDateString('es-CO')}.`
      : '';

    this.notificationService.createNotification({
      title: '💉 Vacuna registrada',
      message: `${petLabel} recibió la vacuna de ${this.vaccineType}.${nextDoseLabel}`,
      type: 'MEDICAL',
      sendAt: new Date().toISOString()
    }).subscribe({
      error: (err) => console.error('❌ No se pudo crear la notificación de vacuna:', err)
    });
  }

  cancel() {
    history.back();
  }

  goBack() {
    history.back();
  }
}