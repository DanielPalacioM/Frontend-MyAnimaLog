import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PetService, Pet as PetModel } from 'src/app/services/PetService/pet';
import { ProfileService } from 'src/app/services/ProfileService/profile';

import { MedicalHistorySection, MedicalHistorySummary } from '../../shared/components/medical-history-card/medical-history-card.component';
import { VaccineSummary } from '../../shared/components/vaccine-card/vaccine-card.component';
import { CalendarEvent as PetCalendarEvent } from '../../shared/components/pet-calendar/pet-calendar.component';
import { CalendarEvent as BackendCalendarEvent } from 'src/app/models/calendar-event.model';
import { EVENT_TYPE_DEFAULTS } from 'src/app/models/calendar-event-options';
import { PetDocument } from 'src/app/models/pet-document.model';
import { MedicalHistoryService } from '../../services/MedicalHistoryService/medical-history';
import { VaccineService } from '../../services/VaccineService/vaccine/vaccine';
import { DocumentService } from 'src/app/services/DocumentService/document-service/document-service';
import { CalendarService } from 'src/app/services/CalendarService/calendar';

interface PetStats {
  age: string;
  weight: string;
  gender: string;
  height: string;
}

@Component({
  selector: 'app-pet-profile',
  templateUrl: './pet-profile.page.html',
  styleUrls: ['./pet-profile.page.scss'],
  standalone: false
})
export class PetProfilePage implements OnInit {

  sidebarOpen = false;
  selectedDate: string | null = null;
  showDeleteConfirm = false;
  loading = true;
  loadError = false;

  pet: PetModel | null = null;

  userName = '';
  userEmail = '';
  userAvatar = 'assets/images/default-avatar.png';

  petStats: PetStats = {
    age: '—',
    weight: 'No registrado',
    gender: '—',
    height: 'No registrado',
  };

  historyItems: MedicalHistorySummary[] = [
    { section: 'visits',     label: 'Visitas veterinarias', count: 0, icon: 'assets/images/PetProfiile/VisitasVeterinariasIcon.png' },
    { section: 'treatments', label: 'Tratamientos',         count: 0, icon: 'assets/images/PetProfiile/TratamientosIcon.png' },
    { section: 'lab',        label: 'Lab',                  count: 0, icon: 'assets/images/PetProfiile/LabIcon.png' },
    { section: 'surgeries',  label: 'Cirugías',             count: 0, icon: 'assets/images/PetProfiile/CirugiasIcon.png' },
  ];

  vaccineSummary: VaccineSummary | null = null;

  calendarEvents: PetCalendarEvent[] = [];

  documents: PetDocument[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petService: PetService,
    private profileService: ProfileService,
    private medicalHistoryService: MedicalHistoryService,
    private vaccineService: VaccineService,
    private documentService: DocumentService,
    private calendarService: CalendarService
  ) {}

  ngOnInit(): void {
    this.loadUserData();

    const petId = this.route.snapshot.paramMap.get('id');
    if (!petId) {
      this.loadError = true;
      this.loading = false;
      return;
    }
    this.loadPet(petId);
  }

  ionViewWillEnter() {
    const petId = this.route.snapshot.paramMap.get('id');
    if (petId) {
      this.loadPet(petId);
    }
    this.loadUserData();
  }

  private loadUserData(): void {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.userName = profile.username || '';
        this.userEmail = profile.email || '';
        if (profile.profileImageUrl) {
          this.userAvatar = profile.profileImageUrl;
        }
      },
      error: (err) => {
        console.error('❌ Error cargando datos del usuario:', err);
      }
    });
  }

  private loadPet(id: string): void {
    this.loading = true;
    this.petService.getPetById(id).subscribe({
      next: (pet) => {
        this.pet = pet;
        this.petStats = this.buildStats(pet);
        this.loading = false;
        this.loadMedicalHistoryCounts(id);
        this.loadVaccineSummary(id);
        this.loadDocuments(id);
        this.loadCalendarEvents(id);
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  private loadDocuments(petId: string): void {
    this.documentService.getDocumentsByPet(petId).subscribe({
      next: (docs) => this.documents = docs,
      error: (err) => console.error('❌ Error cargando documentos:', err)
    });
  }

  private loadCalendarEvents(petId: string): void {
    this.calendarService.getAllUserEvents().subscribe({
      next: (events) => {
        this.calendarEvents = events
          .filter(e => e.pet_id === petId)
          .map(e => this.mapToPetCalendarEvent(e));
      },
      error: (err) => console.error('❌ Error cargando eventos:', err)
    });
  }

  private ensureUtc(dateStr: string): string {
  // Si ya trae 'Z' o un offset explícito (+hh:mm / -hh:mm), se deja igual.
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return dateStr + 'Z';
}

  private mapToPetCalendarEvent(e: BackendCalendarEvent): PetCalendarEvent {
  const start = new Date(this.ensureUtc(e.start_date));
  const date = this.toLocalDateString(start);
  const time = this.toLocalTimeString(start);

  let endTime: string | undefined;
  if (e.end_date) {
    const end = new Date(this.ensureUtc(e.end_date));
    endTime = this.toLocalTimeString(end);
  }

  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: date,
    time: time,
    endTime: endTime,
    type: e.event_type,
    color: e.color || EVENT_TYPE_DEFAULTS[e.event_type]?.color || '#4037BE',
  };
}

private toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

private toLocalTimeString(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

  private loadVaccineSummary(petId: string): void {
    this.vaccineService.getVaccinesByPet(petId).subscribe({
      next: (vaccines) => {
        if (vaccines.length === 0) {
          this.vaccineSummary = null;
          return;
        }

        const today = new Date();
        const applied = vaccines.filter(v => new Date(v.applicationDate) <= today);

        const upcoming = vaccines
          .filter(v => v.nextDoseDate && new Date(v.nextDoseDate) >= today)
          .sort((a, b) => new Date(a.nextDoseDate!).getTime() - new Date(b.nextDoseDate!).getTime());

        const next = upcoming[0] || null;
        const nextDate = next?.nextDoseDate ? new Date(next.nextDoseDate) : null;
        const daysUntil = nextDate
          ? Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        this.vaccineSummary = {
          appliedCount: applied.length,
          totalCount: vaccines.length,
          nextVaccineName: next?.name || null,
          nextVaccineDate: nextDate,
          daysUntilNext: daysUntil,
        };
      },
      error: (err) => {
        console.error('❌ Error cargando vacunas:', err);
        this.vaccineSummary = null;
      }
    });
  }

  private loadMedicalHistoryCounts(petId: string): void {
    this.medicalHistoryService.getVisitsByPet(petId).subscribe({
      next: (visits) => {
        this.setCount('visits', visits.length);

        if (visits.length === 0) {
          this.setCount('treatments', 0);
          this.setCount('lab', 0);
          return;
        }

        let treatmentsFound = 0;
        let labsFound = 0;
        let completed = 0;
        const total = visits.length * 2;

        const checkDone = () => {
          completed++;
          if (completed === total) {
            this.setCount('treatments', treatmentsFound);
            this.setCount('lab', labsFound);
          }
        };

        visits.forEach((visit) => {
          this.medicalHistoryService.getTreatmentForVisit(visit.id).subscribe({
            next: (treatment) => {
              if (treatment) treatmentsFound++;
              checkDone();
            },
            error: () => checkDone()
          });

          this.medicalHistoryService.getLabResultsByVisit(visit.id).subscribe({
            next: (labs) => {
              labsFound += labs.length;
              checkDone();
            },
            error: () => checkDone()
          });
        });
      },
      error: (err) => console.error('❌ Error contando visitas:', err)
    });

    this.medicalHistoryService.getSurgeriesByPet(petId).subscribe({
      next: (surgeries) => this.setCount('surgeries', surgeries.length),
      error: (err) => console.error('❌ Error contando cirugías:', err)
    });
  }

  private setCount(section: MedicalHistorySection, count: number): void {
    const item = this.historyItems.find(h => h.section === section);
    if (item) item.count = count;
  }

  private buildStats(pet: PetModel): PetStats {
    return {
      age: this.formatAge(pet.ageMonths, pet.birthDate),
      weight: pet.weight != null ? `${pet.weight} kg` : 'No registrado',
      gender: pet.sex || '—',
      height: pet.height != null ? `${pet.height} cm` : 'No registrado',
    };
  }

  private formatAge(ageMonths: number | null, birthDate: string): string {
    if (ageMonths !== null && ageMonths !== undefined) {
      if (ageMonths < 12) return `${ageMonths} meses`;
      const years = Math.floor(ageMonths / 12);
      const months = ageMonths % 12;
      return months > 0 ? `${years} años ${months} meses` : `${years} años`;
    }
    if (birthDate) {
      const birth = new Date(birthDate);
      const now = new Date();
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`;
    }
    return '—';
  }

  getPetIconFallback(species: string | undefined): string {
    const speciesMap: { [key: string]: string } = {
      'perro': '🐶',
      'gato': '🐱',
      'loro': '🦜',
      'ave': '🦜',
      'conejo': '🐰',
      'hamster': '🐹',
      'pez': '🐠',
      'reptil': '🦎',
    };
    const key = (species || '').toLowerCase().trim();
    return speciesMap[key] || '🐾';
  }

  getSexColor(sex: string | undefined): string {
    const s = (sex || '').toLowerCase().trim();
    if (s === 'macho' || s === 'male') return '#4A90E2';
    if (s === 'hembra' || s === 'female') return '#FF8FB1';
    return '#CCCCCC';
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void  { this.sidebarOpen = false; }

  onBuscarMascota(): void {
    this.closeSidebar();
    this.router.navigate(['/add-pet']);
  }

  onHome(): void {
    this.closeSidebar();
    this.router.navigateByUrl('/home');
  }

  onFiltrarVacunas(): void {
    this.closeSidebar();
    if (!this.pet) return;
    this.router.navigate(['/vaccine-timeline'], { queryParams: { petId: this.pet.id, filter: true } });
  }

  onPersonasAcceso(): void {
    this.closeSidebar();
    if (!this.pet) return;
    this.router.navigate(['/shared-profiles'], { queryParams: { petId: this.pet.id } });
  }

  onAgendarCita(): void {
    this.closeSidebar();
    if (!this.pet) return;
    this.router.navigate(['/calendar/add-event'], { queryParams: { petId: this.pet.id } });
  }

  onEditarInfo(): void {
    this.closeSidebar();
    if (!this.pet) return;
    this.router.navigate(['/pets', this.pet.id, 'edit']);
  }

  onEliminarMascota(): void {
    this.closeSidebar();
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  confirmDelete(): void {
    this.showDeleteConfirm = false;
    if (!this.pet) return;
    this.petService.deletePet(this.pet.id).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => console.error('❌ Error eliminando mascota:', err)
    });
  }

  onHistorySection(section: MedicalHistorySection): void {
    if (!this.pet) return;
    this.router.navigate(['/medical-history', this.pet.id], { queryParams: { tab: section } });
  }

  goToMedicalHistory(): void {
    if (!this.pet) return;
    this.router.navigate(['/medical-history', this.pet.id]);
  }

  goToRegisterVaccine(): void {
    if (!this.pet) return;
    this.router.navigate(['/register-vaccine'], { queryParams: { petId: this.pet.id } });
  }

  goToVaccineLine(): void {
    if (!this.pet) return;
    this.router.navigate(['/vaccine-timeline'], { queryParams: { petId: this.pet.id } });
  }

  onDateSelected(date: string): void {
    this.selectedDate = date;
  }

  onEditEvent(event: PetCalendarEvent): void {
    this.router.navigate(['/calendar/add-event'], {
      queryParams: { eventId: event.id, petId: this.pet?.id }
    });
  }

  onDeleteEvent(event: PetCalendarEvent): void {
    this.calendarService.deleteEvent(event.id).subscribe({
      next: () => {
        this.calendarEvents = this.calendarEvents.filter(e => e.id !== event.id);
      },
      error: (err) => console.error('❌ Error eliminando evento:', err)
    });
  }

  onAddCalendarEvent(): void {
    if (!this.pet) return;
    this.router.navigate(['/calendar/add-event'], {
      queryParams: { petId: this.pet.id }
    });
  }

  goToAllDocuments(): void {
    if (!this.pet) return;
    this.router.navigate(['/pets', this.pet.id, 'documents']);
  }

  goToAddDocument(): void {
    if (!this.pet) return;
    this.router.navigate(['/pets', this.pet.id, 'documents', 'upload']);
  }

  onDocClick(doc: PetDocument): void {
    console.log('doc clicked', doc);
  }
  
 
}