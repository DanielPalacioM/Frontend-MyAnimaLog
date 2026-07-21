import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MedicalHistorySection, MedicalHistorySummary } from '../../shared/components/medical-history-card/medical-history-card.component';
import { VaccineSummary } from '../../shared/components/vaccine-card/vaccine-card.component';
import { CalendarEvent } from '../../shared/components/pet-calendar/pet-calendar.component';
import { PetDocument } from '../../shared/components/documents-section/documents-section.component';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  ageUnit: string;
  weight: number;
  height: number;
  gender: string;
  species: 'cat' | 'dog';
  imageUrl: string;
  
  
}

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

  pet: Pet = {
    id: '1',
    name: 'Juan',
    breed: 'Siamés',
    age: 5,
    ageUnit: 'meses',
    weight: 40,
    height: 60,
    gender: 'Macho',
    species: 'cat',
    imageUrl: 'assets/images/Profile/cat-juan.png',
  };

  petStats: PetStats = {
    age: '5 meses',
    weight: '40 kg',
    gender: 'Macho',
    height: '60 cm',
  };

  historyItems: MedicalHistorySummary[] = [
    { section: 'visits',     label: 'Visitas veterinarias', count: 12, icon: 'assets/images/PetProfiile/VisitasVeterinariasIcon.png' },
    { section: 'treatments', label: 'Tratamientos',         count: 3,  icon: 'assets/images/PetProfiile/TratamientosIcon.png' },
    { section: 'lab',        label: 'Lab',                  count: 3,  icon: 'assets/images/PetProfiile/LabIcon.png' },
    { section: 'surgeries',  label: 'Cirugías',             count: 1,  icon: 'assets/images/PetProfiile/CirugiasIcon.png' },
  ];

  vaccineSummary: VaccineSummary = {
    appliedCount: 5,
    totalCount: 8,
    nextVaccineName: 'Moquillo',
    nextVaccineDate: new Date(2026, 5, 20),
    daysUntilNext: 12,
  };

  calendarEvents: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'Medicamento - 1 cápsula de omeprazol 20 mg',
      description: '1 cápsula de omeprazol 20 mg',
      date: '2026-06-03',
      time: '10:40',
      type: 'medicine',
      color: '#FFB84F',
      intervalHours: 8
    },
    {
      id: 'e2',
      title: 'Control veterinario',
      description: 'Revisión general anual',
      date: '2026-06-03',
      time: '16:00',
      type: 'vet',
      color: '#4037BE'
    },
    {
      id: 'e3',
      title: 'Vacuna antirrábica',
      description: 'Refuerzo anual obligatorio',
      date: '2026-06-10',
      time: '09:00',
      type: 'vaccine',
      color: '#1a7a4a'
    },
  ];

  documents: PetDocument[] = [
    { id: 'd1', name: 'Sangre.pdf', type: 'pdf',   date: 'Ene 2026' },
    { id: 'd2', name: 'Rayos',      type: 'image', date: 'May 2026' },
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const petId = this.route.snapshot.paramMap.get('id');
    // TODO: cargar datos reales con PetsService.getById(petId)
  }

  // ── Sidebar ──
  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void  { this.sidebarOpen = false; }

  onBuscarMascota(): void {}

  onHome(): void {
    this.closeSidebar();
    this.router.navigateByUrl('/home');
  }

  onFiltrarVacunas(): void {
    this.closeSidebar();
    this.router.navigate(['/pets', this.pet.id, 'vaccines'], { queryParams: { filter: true } });
  }

  onPersonasAcceso(): void {
    this.closeSidebar();
    this.router.navigate(['/shared-profiles'], { queryParams: { petId: this.pet.id } });
  }

  onAgendarCita(): void {
    this.closeSidebar();
    this.router.navigate(['/calendar/add'], { queryParams: { petId: this.pet.id } });
  }

  onEditarInfo(): void {
    this.closeSidebar();
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
  this.router.navigate(['/pets', this.pet.id, 'delete']);
}

  // ── Header ──
  getSpeciesIcon(): string {
    return this.pet.species === 'cat'
      ? 'assets/images/PetProfiile/CatIcon.png'
      : 'assets/images/PetProfiile/DogIcon.png';
  }

  // ── Historial médico ──
  onHistorySection(section: MedicalHistorySection): void {
    this.router.navigate(['/pets', this.pet.id, 'medical-history', section]);
  }

  goToMedicalHistory(): void {
    this.router.navigate(['/pets', this.pet.id, 'medical-history']);
  }

  // ── Vacunas ──
  goToVaccineLine(): void {
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
    this.router.navigate(['/calendar/add'], { queryParams: { petId: this.pet.id } });
  }

  // ── Documentos ──
  goToAllDocuments(): void {
    this.router.navigate(['/pets', this.pet.id, 'documents']);
  }

  goToAddDocument(): void {
    this.router.navigate(['/pets', this.pet.id, 'documents', 'upload']);
  }

  onDocClick(doc: PetDocument): void {
    console.log('doc clicked', doc);
    // TODO: abrir visor o detalle del documento
  }
}