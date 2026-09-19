import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PetService, Pet } from 'src/app/services/PetService/pet';
import { CalendarService } from 'src/app/services/CalendarService/calendar';
import { CalendarEvent as BackendCalendarEvent } from 'src/app/models/calendar-event.model';
import { EVENT_TYPE_DEFAULTS, EventType } from 'src/app/models/calendar-event.model';
import { CalendarEvent as WidgetCalendarEvent } from '../../shared/components/pet-calendar/pet-calendar.component';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false
})
export class CalendarPage implements OnInit {

  loading = true;
  selectedDate: string | null = null;
  events: WidgetCalendarEvent[] = [];

  // Grid de mes
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  weeks: (Date | null)[][] = [];
  viewMode: 'day' | 'week' | 'month' = 'day';
  


  // Header con avatares
  maxVisibleAvatars = 3;
  showOptionsMenu = false;

  // Modal de detalle
  selectedEvent: WidgetCalendarEvent | null = null;

  private pets: Pet[] = [];
  private rawEvents: BackendCalendarEvent[] = [];

  readonly HOUR_HEIGHT = 60; // px por hora
  readonly WEEK_START_HOUR = 7;
  readonly WEEK_END_HOUR = 22;

  constructor(
    private router: Router,
    private petService: PetService,
    private calendarService: CalendarService
  ) {}

  ngOnInit(): void {
    this.selectedDate = this.toDateKey(new Date());
    this.loadData();
  }

  ionViewWillEnter(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.petService.getPets().subscribe({
      next: (pets) => {
        this.pets = pets;
        this.loadEvents();
      },
      error: (err) => {
        console.error('❌ Error cargando mascotas:', err);
        this.pets = [];
        this.loadEvents();
      }
    });
  }

  private loadEvents(): void {
    this.calendarService.getAllUserEvents().subscribe({
      next: (events) => {
        this.rawEvents = events;
        this.events = events.map(e => this.mapToWidgetEvent(e));
        this.buildMonthGrid();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando eventos:', err);
        this.rawEvents = [];
        this.events = [];
        this.buildMonthGrid();
        this.loading = false;
      }
    });
  }

  private mapToWidgetEvent(e: BackendCalendarEvent): WidgetCalendarEvent {
    const [datePart, timePart] = e.start_date.split('T');
    const time = timePart ? timePart.substring(0, 5) : '00:00';
    const petName = this.pets.find(p => p.id === e.pet_id)?.name;
    const title = petName && this.pets.length > 1 ? `${petName} · ${e.title}` : e.title;

    return {
      id: e.id,
      title,
      description: e.description,
      date: datePart,
      time,
      type: e.event_type,
      color: e.color || EVENT_TYPE_DEFAULTS[e.event_type]?.color || '#4037BE',
    };
  }

  // ============ GRID DE MES ============

  private buildMonthGrid(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    const firstWeekday = (firstDay.getDay() + 6) % 7; // lunes = 0

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(this.currentYear, this.currentMonth, d));
    }
    while (days.length % 7 !== 0) days.push(null);

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    this.weeks = weeks;
  }

  prevMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.buildMonthGrid();
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    this.buildMonthGrid();
  }

  private toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  selectDate(day: Date | null): void {
    if (!day) return;
    this.selectedDate = this.toDateKey(day);
  }

  isToday(day: Date | null): boolean {
    if (!day) return false;
    return this.toDateKey(day) === this.toDateKey(new Date());
  }

  isSelected(day: Date | null): boolean {
    if (!day) return false;
    return this.toDateKey(day) === this.selectedDate;
  }

  getDotsForDay(day: Date | null): WidgetCalendarEvent[] {
    if (!day) return [];
    const key = this.toDateKey(day);
    return this.events.filter(e => e.date === key).slice(0, 3);
  }

  hasMoreEvents(day: Date | null): boolean {
    if (!day) return false;
    const key = this.toDateKey(day);
    return this.events.filter(e => e.date === key).length > 3;
  }

  get selectedDayEvents(): WidgetCalendarEvent[] {
    if (!this.selectedDate) return [];
    return this.events
      .filter(e => e.date === this.selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  get selectedDateLabel(): string {
    if (!this.selectedDate) return '';
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  // ============ HEADER: avatares de mascotas ============

  get visiblePets(): Pet[] {
    return this.pets.slice(0, this.maxVisibleAvatars);
  }

  get extraPetsCount(): number {
    return Math.max(0, this.pets.length - this.maxVisibleAvatars);
  }

  toggleOptionsMenu(): void {
    this.showOptionsMenu = !this.showOptionsMenu;
  }

  closeOptionsMenu(): void {
    this.showOptionsMenu = false;
  }

  // ============ TIPOS DE EVENTO ============

  getTypeIcon(type: EventType): string {
  return EVENT_TYPE_DEFAULTS[type]?.icon || 'calendar-outline';
}

setViewMode(mode: 'day' | 'week' | 'month'): void {
  this.viewMode = mode;
  this.showOptionsMenu = false;
  // TODO: cuando existan las vistas día/semana, aquí se dispara el cambio real
}

get headerDateLabel(): string {
  const now = new Date();
  return now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

  // ============ MODAL DE DETALLE ============

  openEventModal(ev: WidgetCalendarEvent): void {
    this.selectedEvent = ev;
  }

  closeEventModal(): void {
    this.selectedEvent = null;
  }

  // ============ ACCIONES ============

  onDateSelected(date: string): void {
    this.selectedDate = date;
  }

  onAddEvent(): void {
    this.router.navigate(['/calendar/add-event']);
  }

  onEditEvent(event: WidgetCalendarEvent): void {
    const raw = this.rawEvents.find(e => e.id === event.id);
    this.router.navigate(['/calendar/add-event'], {
      queryParams: { eventId: event.id, petId: raw?.pet_id || undefined }
    });
  }

  onDeleteEvent(event: WidgetCalendarEvent): void {
    this.calendarService.deleteEvent(event.id).subscribe({
      next: () => {
        this.events = this.events.filter(e => e.id !== event.id);
        this.rawEvents = this.rawEvents.filter(e => e.id !== event.id);
        this.selectedEvent = null;
      },
      error: (err) => console.error('❌ Error eliminando evento:', err)
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/home');
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

dayHours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 a 21:00, ajusta rango si hace falta

get selectedDayNavLabel(): string {
  return this.selectedDateLabel;
}

prevDay(): void {
  if (!this.selectedDate) return;
  const [y, m, d] = this.selectedDate.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1);
  this.selectedDate = this.toDateKey(date);
}

nextDay(): void {
  if (!this.selectedDate) return;
  const [y, m, d] = this.selectedDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + 1);
  this.selectedDate = this.toDateKey(date);
}

get currentWeekDays(): Date[] {
  if (!this.selectedDate) return [];
  const [y, m, d] = this.selectedDate.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  const dayOfWeek = (current.getDay() + 6) % 7; // lunes = 0
  const monday = new Date(current);
  monday.setDate(current.getDate() - dayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

getDayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

prevWeek(): void {
  if (!this.selectedDate) return;
  const [y, m, d] = this.selectedDate.split('-').map(Number);
  const date = new Date(y, m - 1, d - 7);
  this.selectedDate = this.toDateKey(date);
}

nextWeek(): void {
  if (!this.selectedDate) return;
  const [y, m, d] = this.selectedDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + 7);
  this.selectedDate = this.toDateKey(date);
}

getEventsForHourAndDay(day: Date, hour: number): WidgetCalendarEvent[] {
  const key = this.toDateKey(day);
  return this.events.filter(e => {
    if (e.date !== key) return false;
    const eventHour = parseInt(e.time.split(':')[0], 10);
    return eventHour === hour;
  });
}

get monthHasEvents(): boolean {
  const prefix = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
  return this.events.some(e => e.date.startsWith(prefix));
}

get weekHours(): number[] {
  const hours = [];
  for (let h = this.WEEK_START_HOUR; h <= this.WEEK_END_HOUR; h++) hours.push(h);
  return hours;
}

get weekGridHeight(): number {
  return (this.WEEK_END_HOUR - this.WEEK_START_HOUR + 1) * this.HOUR_HEIGHT;
}

getEventsForDay(day: Date): WidgetCalendarEvent[] {
  const key = this.toDateKey(day);
  return this.events.filter(e => e.date === key);
}

getEventStyle(ev: WidgetCalendarEvent): { top: string; height: string } {
  const [h, m] = ev.time.split(':').map(Number);
  const startDecimal = h + m / 60;

  // Duración: si no hay endTime explícito en el evento, usamos 1 hora por defecto
  const durationHours = (ev as any).endTime ? this.getDurationHours(ev.time, (ev as any).endTime) : 1;

  const top = (startDecimal - this.WEEK_START_HOUR) * this.HOUR_HEIGHT;
  const height = Math.max(durationHours * this.HOUR_HEIGHT, 24); // mínimo 24px para que siempre se vea algo

  return {
    top: `${top}px`,
    height: `${height}px`,
  };
}

private getDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startDecimal = sh + sm / 60;
  const endDecimal = eh + em / 60;
  return Math.max(endDecimal - startDecimal, 0.25);
}

formatEventTimeRange(ev: WidgetCalendarEvent): string {
  const endTime = (ev as any).endTime;
  if (!endTime) return this.formatTimeLabel(ev.time);
  return `${this.formatTimeLabel(ev.time)} - ${this.formatTimeLabel(endTime)}`;
}

private formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m);
  return date.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
}

get weekHasEvents(): boolean {
  const weekKeys = this.currentWeekDays.map(d => this.toDateKey(d));
  return this.events.some(e => weekKeys.includes(e.date));
}

}