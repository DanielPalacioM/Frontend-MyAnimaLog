import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PetService, Pet as PetModel } from 'src/app/services/PetService/pet';
import { ProfileService } from 'src/app/services/ProfileService/profile';

import { MedicalHistorySection, MedicalHistorySummary } from '../../shared/components/medical-history-card/medical-history-card.component';
import { VaccineSummary } from '../../shared/components/vaccine-card/vaccine-card.component';
import { CalendarEvent } from '../../shared/components/pet-calendar/pet-calendar.component';
import { PetDocument } from '../../shared/components/documents-section/documents-section.component';

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

  // Usuario logueado, para el sidebar
  userName = '';
  userEmail = '';
  userAvatar = 'assets/images/default-avatar.png';

  petStats: PetStats = {
    age: '—',
    weight: 'No registrado',
    gender: '—',
    height: 'No registrado',
  };

  // TODO: reemplazar por datos reales cuando exista el servicio de historial médico
  historyItems: MedicalHistorySummary[] = [
    { section: 'visits',     label: 'Visitas veterinarias', count: 0, icon: 'assets/images/PetProfiile/VisitasVeterinariasIcon.png' },
    { section: 'treatments', label: 'Tratamientos',         count: 0, icon: 'assets/images/PetProfiile/TratamientosIcon.png' },
    { section: 'lab',        label: 'Lab',                  count: 0, icon: 'assets/images/PetProfiile/LabIcon.png' },
    { section: 'surgeries',  label: 'Cirugías',             count: 0, icon: 'assets/images/PetProfiile/CirugiasIcon.png' },
  ];

  // TODO: reemplazar por datos reales cuando exista el servicio de vacunas
  vaccineSummary: VaccineSummary | null = null; // null = "no hay vacunas registradas"

  calendarEvents: CalendarEvent[] = []; // TODO: cargar desde servicio de calendario cuando exista

  documents: PetDocument[] = []; // TODO: cargar desde servicio de documentos cuando exista

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petService: PetService,
    private profileService: ProfileService
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
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  private buildStats(pet: PetModel): PetStats {
    return {
      age: this.formatAge(pet.ageMonths, pet.birthDate),
      weight: pet.weight != null ? `${pet.weight} kg` : 'No registrado',      gender: pet.sex || '—',
      height: pet.height != null ? `${pet.height} cm` : 'No registrado',    };
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

  // ── Fallback de ícono/color por especie y sexo (igual que en Home) ──
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
    if (s === 'macho' || s === 'male') return '#4A90E2'; // azul
    if (s === 'hembra' || s === 'female') return '#FF8FB1'; // rosa
    return '#CCCCCC'; // neutro si no hay dato
  }

  // ── Sidebar ──
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
    this.router.navigate(['/pets', this.pet.id, 'vaccines'], { queryParams: { filter: true } });
  }

  onPersonasAcceso(): void {
    this.closeSidebar();
    if (!this.pet) return;
    this.router.navigate(['/shared-profiles'], { queryParams: { petId: this.pet.id } });
  }

  onAgendarCita(): void {
    this.closeSidebar();
    if (!this.pet) return;
    this.router.navigate(['/calendar/add'], { queryParams: { petId: this.pet.id } });
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

  // ── Historial médico ──
  onHistorySection(section: MedicalHistorySection): void {
    if (!this.pet) return;
    this.router.navigate(['/pets', this.pet.id, 'medical-history', section]);
  }

  goToMedicalHistory(): void {
    if (!this.pet) return;
    this.router.navigate(['/pets', this.pet.id, 'medical-history']);
  }

  // ── Vacunas ──
  goToVaccineLine(): void {
    if (!this.pet) return;
    this.router.navigate(['/pets', this.pet.id, 'vaccines']);
  }

  // ── Calendario ──
  onDateSelected(date: string): void {
    this.selectedDate = date;
  }

  onEditEvent(event: CalendarEvent): void {
    this.router.navigate(['/calendar', event.id, 'edit']);
  }

  onDeleteEvent(event: CalendarEvent): void {
    this.calendarEvents = this.calendarEvents.filter(e => e.id !== event.id);
  }

  onAddCalendarEvent(): void {
    if (!this.pet) return;
    this.router.navigate(['/calendar/add'], { queryParams: { petId: this.pet.id } });
  }

  // ── Documentos ──
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