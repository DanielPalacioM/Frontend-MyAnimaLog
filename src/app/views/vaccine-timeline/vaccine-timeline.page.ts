import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VaccineTimelineItem } from '../../shared/components/vaccine-timeline-card/vaccine-timeline-card.component';
import { VaccineService } from 'src/app/services/VaccineService/vaccine/vaccine'; 
import { PetService } from 'src/app/services/PetService/pet';
import { Vaccine } from 'src/app/models/vaccine.model';
import { TutorialService, TutorialStep } from 'src/app/services/TutorialService/tutorial';

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

  // año de cada vacuna sacado de la fecha cruda (no del texto formateado en español)
  private yearById = new Map<string, number | null>();

  tourOpen = false;
  tourSteps: TutorialStep[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vaccineService: VaccineService,
    private petService: PetService,
    private tutorialService: TutorialService
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

  private maybeStartTutorial(): void {
    if (this.tourOpen || this.tutorialService.hasSeen('vaccine-timeline')) return;
    this.tourSteps = this.tutorialService.getSteps('vaccine-timeline');
    this.tourOpen = true;
  }

  onTourClosed(): void {
    this.tutorialService.markSeen('vaccine-timeline');
    this.tourOpen = false;
  }

  private loadVaccines() {
    this.loading = true;
    this.vaccineService.getVaccinesByPet(this.petId).subscribe({
      next: (vaccines) => {
        this.buildTimeline(vaccines);
        this.loading = false;
        this.maybeStartTutorial();
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

    this.yearById.clear();

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

      const yearDate = status === 'applied' ? applicationDate : (nextDoseDate ?? applicationDate);
      const year = yearDate.getFullYear();
      this.yearById.set(v.id, isNaN(year) ? null : year);

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

    const yearsSet = new Set<number>();
    this.yearById.forEach(y => { if (y !== null) yearsSet.add(y); });
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
      const year = this.yearById.get(v.id);
      if (year == null) return true; // sin fecha válida: se muestra siempre
      return year === this.selectedYear;
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