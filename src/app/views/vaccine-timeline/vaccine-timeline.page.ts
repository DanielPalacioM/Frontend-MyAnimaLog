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

    // cada vacuna da una fila por la dosis registrada y otra por su próxima dosis
    const rows: { item: VaccineTimelineItem; date: Date }[] = [];

    rawVaccines.forEach((v) => {
      const applicationDate = new Date(v.applicationDate);
      const nextDoseDate = v.nextDoseDate ? new Date(v.nextDoseDate) : null;
      const applied = applicationDate <= today;

      rows.push({
        date: applicationDate,
        item: {
          id: v.id,
          vaccineId: v.id,
          kind: 'dose',
          title: v.name,
          applicationDate: applied ? this.formatDate(applicationDate) : undefined,
          dueDate: applied ? undefined : this.formatDate(applicationDate),
          veterinary: v.veterinarian,
          batch: v.lotNumber,
          status: applied ? 'applied' : 'pending',
          attachment: false,
          appointment: false,
        }
      });

      if (!nextDoseDate || isNaN(nextDoseDate.getTime())) return;

      // si ya se registró una dosis posterior de la misma vacuna, la próxima dosis ya se cumplió
      const name = (v.name || '').trim().toLowerCase();
      const fulfilled = rawVaccines.some(o =>
        o.id !== v.id &&
        (o.name || '').trim().toLowerCase() === name &&
        new Date(o.applicationDate) > applicationDate
      );
      if (fulfilled) return;

      rows.push({
        date: nextDoseDate,
        item: {
          id: `${v.id}-next`,
          vaccineId: v.id,
          kind: 'next',
          title: v.name,
          dueDate: this.formatDate(nextDoseDate),
          veterinary: v.veterinarian,
          status: nextDoseDate < today ? 'late' : 'pending',
          attachment: false,
          appointment: false,
        }
      });
    });

    rows.forEach(({ item, date }) => {
      const year = date.getFullYear();
      this.yearById.set(item.id, isNaN(year) ? null : year);
    });

    // más recientes primero (las próximas dosis futuras quedan arriba)
    rows.sort((a, b) => (b.date.getTime() || 0) - (a.date.getTime() || 0));
    const items = rows.map(r => r.item);

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
    this.router.navigate(['/vaccine-info', vaccine.vaccineId], {
      queryParams: { petId: this.petId, kind: vaccine.kind }
    });
  }

  goBack() {
    history.back();
  }

  goToRegister() {
  this.router.navigate(['/register-vaccine'], { queryParams: { petId: this.petId } });
}
}