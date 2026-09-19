import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VaccineTimelineItem } from '../../shared/components/vaccine-timeline-card/vaccine-timeline-card.component';
import { VaccineService } from 'src/app/services/VaccineService/vaccine/vaccine'; 
import { PetService } from 'src/app/services/PetService/pet';
import { Vaccine } from 'src/app/models/vaccine.model';

@Component({
  selector: 'app-vaccine-timeline',
  templateUrl: './vaccine-timeline.page.html',
  styleUrls: ['./vaccine-timeline.page.scss'],
  standalone: false
})
export class VaccineTimelineComponent implements OnInit {

  petId = '';
  petName = '';
  petAvatar: string | null = null;

  appliedCount = 0;
  pendingCount = 0;
  lateCount = 0;
  totalCount = 0;

  selectedYear = new Date().getFullYear();
  years: number[] = [];

  vaccines: VaccineTimelineItem[] = [];
  loading = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vaccineService: VaccineService,
    private petService: PetService
  ) {}

  ngOnInit() {
  this.petId = this.route.snapshot.queryParamMap.get('petId') || '';
  if (!this.petId) return;
  this.loadPetInfo();
  this.loadVaccines();
}

ionViewWillEnter() {
  this.petId = this.route.snapshot.queryParamMap.get('petId') || this.petId;
  if (this.petId) this.loadVaccines();
}

  private loadPetInfo() {
    this.petService.getPetById(this.petId).subscribe({
      next: (pet) => {
        this.petName = pet.name;
        this.petAvatar = pet.imageUrl;
      },
      error: (err) => console.error('❌ Error cargando mascota:', err)
    });
  }

  private loadVaccines() {
    this.loading = true;
    this.vaccineService.getVaccinesByPet(this.petId).subscribe({
      next: (vaccines) => {
        this.buildTimeline(vaccines);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando vacunas:', err);
        this.vaccines = [];
        this.loading = false;
      }
    });
  }

  private buildTimeline(rawVaccines: Vaccine[]) {
    const today = new Date();

    const items: VaccineTimelineItem[] = rawVaccines.map((v) => {
      const applicationDate = new Date(v.applicationDate);
      const nextDoseDate = v.nextDoseDate ? new Date(v.nextDoseDate) : null;

      let status: 'applied' | 'pending' | 'late';
      if (nextDoseDate && nextDoseDate < today) {
        status = 'late';
      } else if (applicationDate <= today) {
        status = 'applied';
      } else {
        status = 'pending';
      }

      return {
        id: v.id,
        title: v.name,
        applicationDate: status === 'applied' ? this.formatDate(applicationDate) : undefined,
        dueDate: nextDoseDate ? this.formatDate(nextDoseDate) : undefined,
        veterinary: v.veterinarian,
        batch: v.lotNumber,
        status,
        attachment: false,
        appointment: !!v.nextDoseDate,
      };
    });

    // más recientes primero
    items.sort((a, b) => {
      const dateA = rawVaccines.find(v => v.id === a.id)?.applicationDate || '';
      const dateB = rawVaccines.find(v => v.id === b.id)?.applicationDate || '';
      return dateB.localeCompare(dateA);
    });

    this.vaccines = items;
    this.totalCount = items.length;
    this.appliedCount = items.filter(v => v.status === 'applied').length;
    this.pendingCount = items.filter(v => v.status === 'pending').length;
    this.lateCount = items.filter(v => v.status === 'late').length;

    const yearsSet = new Set(rawVaccines.map(v => new Date(v.applicationDate).getFullYear()));
    this.years = Array.from(yearsSet).sort();
    if (this.years.length > 0 && !this.years.includes(this.selectedYear)) {
      this.selectedYear = this.years[this.years.length - 1];
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  get filteredVaccines(): VaccineTimelineItem[] {
    return this.vaccines.filter(v => {
      const dateStr = v.applicationDate || v.dueDate;
      if (!dateStr) return true; // sugeridas sin fecha
      return new Date(dateStr).getFullYear() === this.selectedYear;
    });
  }

  get progressPercent(): number {
    if (this.totalCount === 0) return 0;
    return Math.round((this.appliedCount / this.totalCount) * 100);
  }

  onOpenVaccine(vaccine: VaccineTimelineItem) {
    this.router.navigate(['/vaccine-info', vaccine.id]);
  }

  goBack() {
    history.back();
  }

  goToRegister() {
  this.router.navigate(['/register-vaccine'], { queryParams: { petId: this.petId } });
}
}