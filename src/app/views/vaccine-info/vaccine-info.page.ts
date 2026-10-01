import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VaccineService } from 'src/app/services/VaccineService/vaccine/vaccine';
import { Vaccine, VaccineStatus } from 'src/app/models/vaccine.model';

@Component({
  selector: 'app-vaccine-info',
  templateUrl: './vaccine-info.page.html',
  styleUrls: ['./vaccine-info.page.scss'],
  standalone: false
})
export class VaccineInfoPage implements OnInit {

  vaccineId: string | null = null;
  petId = '';
  docVisible = false;
  loading = true;
  notFound = false;

  vaccine = {
    id: '',
    title: '',
    applicationDate: '',
    nextDose: '',
    lotNumber: '',
    vet: '',
    notes: '',
    status: 'applied' as VaccineStatus,
    attachment: false,
    docName: '',
    docSize: '',
    reminderActive: true,
    reminderDate: '',
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vaccineService: VaccineService
  ) {}

  ngOnInit() {
    this.vaccineId = this.route.snapshot.paramMap.get('id');
    this.petId = this.route.snapshot.queryParamMap.get('petId') || '';
    this.loadVaccine();
  }

  // el backend no tiene GET por id: se piden las vacunas de la mascota y se busca la que toca
  private loadVaccine() {
    if (!this.vaccineId || !this.petId) {
      this.loading = false;
      this.notFound = true;
      return;
    }
    this.loading = true;
    this.vaccineService.getVaccinesByPet(this.petId).subscribe({
      next: (vaccines) => {
        const v = vaccines.find(x => x.id === this.vaccineId);
        if (v) this.fillVaccine(v);
        else this.notFound = true;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando la vacuna:', err);
        this.notFound = true;
        this.loading = false;
      }
    });
  }

  private fillVaccine(v: Vaccine) {
    const today = new Date();
    const applicationDate = new Date(v.applicationDate);
    const nextDoseDate = v.nextDoseDate ? new Date(v.nextDoseDate) : null;
    const isNext = this.route.snapshot.queryParamMap.get('kind') === 'next';

    // mismo criterio de estado que la línea de vida
    let status: VaccineStatus;
    if (isNext && nextDoseDate) status = nextDoseDate < today ? 'late' : 'pending';
    else status = applicationDate <= today ? 'applied' : 'pending';

    this.vaccine = {
      ...this.vaccine,
      id: v.id,
      title: v.name,
      applicationDate: this.formatDate(applicationDate),
      nextDose: nextDoseDate ? this.formatDate(nextDoseDate) : '',
      lotNumber: v.lotNumber || '',
      vet: v.veterinarian || '',
      notes: v.notes || '',
      status,
      reminderDate: nextDoseDate ? this.formatDate(nextDoseDate) : '',
    };
  }

  private formatDate(date: Date): string {
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
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
      queryParams: { id: this.vaccineId, petId: this.petId, mode: 'edit' }
    });
  }

  delete() {
    history.back();
  }

  goBack() {
    history.back();
  }
}