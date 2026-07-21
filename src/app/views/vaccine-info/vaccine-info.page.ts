import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-vaccine-info',
  templateUrl: './vaccine-info.page.html',
  styleUrls: ['./vaccine-info.page.scss'],
  standalone: false
})
export class VaccineInfoPage implements OnInit {

  vaccineId: string | null = null;
  docVisible = false;

  vaccine = {
    id: '1',
    title: 'Parvovirus',
    applicationDate: '15 ene 2026',
    nextDose: '15 ene 2027',
    lotNumber: 'PV-2026-001',
    vet: 'Dr.Pet',
    info: 'Primera dosis, sin reacciones adversas',
    notes: 'Toleró bien la aplicación. Continuar con el esquema de vacunación normal',
    status: 'applied',
    attachment: true,
    docName: 'Carnet_parvovirus.pdf',
    docSize: '340 KB - VACCINE - activo',
    reminderActive: true,
    appointmentDate: '15 ene 2025',
    appointmentVet: 'Dr.pet - Cartagena',
    appointmentStatus: 'PENDING',
  };

  get statusText(): string {
    switch (this.vaccine.status) {
      case 'applied':  return 'Aplicada';
      case 'late':     return 'Retrasada';
      case 'pending':  return 'En espera';
      default:         return 'Sugerida';
    }
  }

  get statusColor(): string {
    switch (this.vaccine.status) {
      case 'applied':  return '#4037BE';
      case 'late':     return '#e74c3c';
      case 'pending':  return '#FFB84F';
      default:         return '#aaa';
    }
  }

  get heroIcon(): string {
    switch (this.vaccine.status) {
      case 'applied':  return 'assets/images/LineaVidaVacuna/Aplicada.png';
      case 'late':     return 'assets/images/LineaVidaVacuna/Retrasada.png';
      case 'pending':  return 'assets/images/LineaVidaVacuna/EnEspera.png';
      default:         return 'assets/images/LineaVidaVacuna/Sugerida.png';
    }
  }

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.vaccineId = this.route.snapshot.paramMap.get('id');
    // TODO: VaccineService.getById(this.vaccineId)
  }

  toggleDoc() {
    this.docVisible = !this.docVisible;
  }

  downloadDoc() {
    console.log('descargar:', this.vaccine.docName);
  }

  toggleReminder() {
    this.vaccine.reminderActive = !this.vaccine.reminderActive;
  }

  goToCalendar() {
    this.router.navigate(['/calendar']);
  }

  edit() {
    this.router.navigate(['/register-vaccine'], {
      queryParams: { id: this.vaccineId, mode: 'edit' }
    });
  }

  delete() {
    history.back();
  }

  goBack() {
    history.back();
  }
}