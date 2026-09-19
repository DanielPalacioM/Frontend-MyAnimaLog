import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PetService, Pet } from 'src/app/services/PetService/pet';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import { CalendarService } from 'src/app/services/CalendarService/calendar';
import { CalendarEvent, CalendarEventPayload } from 'src/app/models/calendar-event.model';
import { EventType } from 'src/app/models/calendar-event.model';

interface ActivityOption {
  type: EventType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-add-event',
  templateUrl: './add-event.page.html',
  styleUrls: ['./add-event.page.scss'],
  standalone: false
})
export class AddEventPage implements OnInit {

  
  activityOptions: ActivityOption[] = [
    { type: 'VET_APPOINTMENT', label: 'Cita', icon: 'medical-outline' },
    { type: 'MEDICATION', label: 'Medicamento', icon: 'medkit-outline' },
    { type: 'TREATMENT', label: 'Vacuna', icon: 'shield-checkmark-outline' },
    { type: 'OTHER', label: 'Otro', icon: 'add-outline' },
  ];

  
  mode: 'multi' | 'single' = 'multi';
  isEditMode = false;
  loading = false;
  saving = false;
  showDatePicker = false;
  showStartTimePicker = false;
  showEndTimePicker = false;

  dateTimeValue = new Date().toISOString();
  startTimeValue = new Date().toISOString();
  endTimeValue = new Date().toISOString();

  private petIdParam: string | null = null;
  private eventIdParam: string | null = null;

  pets: Pet[] = [];
  selectedPetId: string | null = null;
  selectedPet: Pet | null = null;

  userAvatar = 'assets/images/default-avatar.png';

  selectedType: EventType = 'VET_APPOINTMENT';
  title = '';
  description = '';
  date = '';
  startTime = '';
  endTime = '';
  location = '';

  reminderEnabled = true;
  private readonly reminderOffsetHours = 24; // "1 día antes"

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petService: PetService,
    private profileService: ProfileService,
    private calendarService: CalendarService
  ) {}

  ngOnInit(): void {
    this.petIdParam = this.route.snapshot.queryParamMap.get('petId');
    this.eventIdParam = this.route.snapshot.queryParamMap.get('eventId');
    this.mode = this.petIdParam ? 'single' : 'multi';
    this.isEditMode = !!this.eventIdParam;

    this.loadUserAvatar();

    if (this.mode === 'single' && this.petIdParam) {
      this.loadSinglePet(this.petIdParam);
    } else {
      this.loadPetsList();
    }

    if (this.isEditMode && this.eventIdParam) {
      this.loading = true;
      this.loadEventForEdit(this.eventIdParam);
    }
  }

  private loadUserAvatar(): void {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        if (profile.profileImageUrl) this.userAvatar = profile.profileImageUrl;
      },
      error: (err) => console.error('❌ Error cargando perfil:', err)
    });
  }

  private loadSinglePet(petId: string): void {
    this.petService.getPetById(petId).subscribe({
      next: (pet) => {
        this.selectedPet = pet;
        this.selectedPetId = pet.id;
      },
      error: (err) => console.error('❌ Error cargando mascota:', err)
    });
  }

  private loadPetsList(): void {
    this.petService.getPets().subscribe({
      next: (pets) => {
        this.pets = pets;
        if (!this.selectedPetId && pets.length > 0) {
          this.selectedPetId = pets[0].id;
        }
      },
      error: (err) => console.error('❌ Error cargando mascotas:', err)
    });
  }

  private loadEventForEdit(eventId: string): void {
    this.calendarService.getAllUserEvents().subscribe({
      next: (events) => {
        const ev = events.find(e => e.id === eventId);
        if (ev) this.populateForm(ev);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando evento:', err);
        this.loading = false;
      }
    });
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

  private populateForm(ev: CalendarEvent): void {
  const start = new Date(this.ensureUtc(ev.start_date));
  this.date = this.toLocalDateString(start);
  this.startTime = this.toLocalTimeString(start);

  if (ev.end_date) {
    const end = new Date(this.ensureUtc(ev.end_date));
    this.endTime = this.toLocalTimeString(end);
  }

  this.title = ev.title;
  this.description = ev.description || '';
  this.location = ev.location || '';
  this.selectedType = ev.event_type;
  this.reminderEnabled = ev.reminder_enabled;
  this.selectedPetId = ev.pet_id || this.selectedPetId;
}

private ensureUtc(dateStr: string): string {
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return dateStr + 'Z';
}

  private parseDescription(raw: string | undefined): { description: string; location: string; endTime: string } {
    const lines = (raw || '').split('\n');
    let location = '';
    let endTime = '';
    const kept: string[] = [];

    for (const line of lines) {
      const locMatch = line.match(/^Lugar:\s*(.+)$/);
      const endMatch = line.match(/^Hora fin:\s*(.+)$/);
      if (locMatch) { location = locMatch[1].trim(); continue; }
      if (endMatch) { endTime = endMatch[1].trim(); continue; }
      kept.push(line);
    }

    return { description: kept.join('\n').trim(), location, endTime };
  }

  selectPet(pet: Pet): void {
    if (this.mode !== 'multi') return;
    this.selectedPetId = pet.id;
  }

  selectType(type: EventType): void {
    this.selectedType = type;
  }

  openDatePicker(): void {
  if (this.date) {
    this.dateTimeValue = new Date(`${this.date}T00:00:00`).toISOString();
  }
  this.showDatePicker = true;
}

onDateConfirm(value: string | string[] | null | undefined): void {
  if (!value || Array.isArray(value)) return;
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  this.date = `${y}-${m}-${day}`;
  this.showDatePicker = false;
}

openStartTimePicker(): void {
  if (this.startTime) {
    this.startTimeValue = new Date(`2000-01-01T${this.startTime}:00`).toISOString();
  }
  this.showStartTimePicker = true;
}

onStartTimeConfirm(value: string | string[] | null | undefined): void {
  if (!value || Array.isArray(value)) return;
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  this.startTime = `${hh}:${mm}`;
  this.showStartTimePicker = false;
}

openEndTimePicker(): void {
  if (this.endTime) {
    this.endTimeValue = new Date(`2000-01-01T${this.endTime}:00`).toISOString();
  }
  this.showEndTimePicker = true;
}

onEndTimeConfirm(value: string | string[] | null | undefined): void {
  if (!value || Array.isArray(value)) return;
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  this.endTime = `${hh}:${mm}`;
  this.showEndTimePicker = false;
}

formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m);
  return date.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
}

  get canSave(): boolean {
    return !!this.selectedPetId && !!this.title.trim() && !!this.date && !!this.startTime;
  }

  get reminderPreviewLabel(): string {
    if (!this.date || !this.startTime) return '';
    const eventDate = new Date(`${this.date}T${this.startTime}:00`);
    if (isNaN(eventDate.getTime())) return '';
    const reminderDate = new Date(eventDate);
    reminderDate.setHours(reminderDate.getHours() - this.reminderOffsetHours);
    const dateLabel = reminderDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeLabel = reminderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${dateLabel} - ${timeLabel}`;
  }

  save(): void {
  if (this.saving || !this.canSave) return;
  this.saving = true;

  const startDateIso = new Date(`${this.date}T${this.startTime}:00`).toISOString();
  const endDateIso = this.endTime
    ? new Date(`${this.date}T${this.endTime}:00`).toISOString()
    : undefined;

  const payload: Omit<CalendarEventPayload, 'userId'> = {
    petId: this.selectedPetId!,
    title: this.title.trim(),
    description: this.description.trim() || undefined,
    eventType: this.selectedType,
    startDate: startDateIso,
    endDate: endDateIso,
    location: this.location.trim() || undefined,
    reminderEnabled: this.reminderEnabled,
    reminderAt: this.reminderEnabled ? this.computeReminderAtIso(startDateIso) : undefined,
  };

  const request = this.isEditMode && this.eventIdParam
    ? this.calendarService.updateEvent(this.eventIdParam, payload)
    : this.calendarService.createEvent(payload);

  request.subscribe({
    next: () => {
      this.saving = false;
      this.goToDestination();
    },
    error: (err) => {
      this.saving = false;
      console.error('❌ Error guardando evento:', err);
      alert('No se pudo guardar el evento. Intenta de nuevo.');
    }
  });
}

  private computeReminderAtIso(eventDateIso: string): string {
    const d = new Date(eventDateIso);
    d.setHours(d.getHours() - this.reminderOffsetHours);
    return d.toISOString();
  }

  private goToDestination(): void {
    if (this.mode === 'single' && this.petIdParam) {
      this.router.navigate(['/pet-profile', this.petIdParam]);
    } else {
      this.router.navigate(['/calendar']);
    }
  }

  goBack(): void {
    history.back();
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
}
