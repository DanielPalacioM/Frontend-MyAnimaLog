import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  type: string;
  color: string;
  intervalHours?: number; // NUEVO: para calcular próxima dosis (ej: 8 = cada 8 horas)
}

@Component({
  selector: 'app-pet-calendar',
  templateUrl: './pet-calendar.component.html',
  styleUrls: ['./pet-calendar.component.scss'],
  standalone: false
})
export class PetCalendarComponent implements OnInit {
  @Input() events: CalendarEvent[] = [];
  @Input() selectedDate: string | null = null;
  @Input() petName: string = '';
  @Input() petAvatarUrl: string = '';

  @Output() dateSelected = new EventEmitter<string>();
  @Output() editEvent = new EventEmitter<CalendarEvent>();
  @Output() deleteEvent = new EventEmitter<CalendarEvent>();
  @Output() addEvent = new EventEmitter<void>(); // NUEVO

  currentDate: Date = new Date();
  currentYear: number = 0;
  currentMonth: number = 0;
  weeks: (Date | null)[][] = [];
  showAllEvents = false;

  monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  dayNames = ['L','M','M','J','V','S','D'];

  ngOnInit() {
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth();
    if (!this.selectedDate) {
      this.selectedDate = this.formatDate(this.currentDate);
    }
    this.buildCalendar();
  }

  buildCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    this.weeks = [];
    let week: (Date | null)[] = [];

    for (let i = 0; i < startDay; i++) week.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      week.push(new Date(this.currentYear, this.currentMonth, d));
      if (week.length === 7) { this.weeks.push(week); week = []; }
    }

    while (week.length > 0 && week.length < 7) week.push(null);
    if (week.length > 0) this.weeks.push(week);
  }

  prevMonth() {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.buildCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.buildCalendar();
  }

  selectDate(date: Date | null) {
    if (!date) return;
    const str = this.formatDate(date);
    this.selectedDate = str;
    this.showAllEvents = false;
    this.dateSelected.emit(str);
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isSelected(date: Date | null): boolean {
    if (!date || !this.selectedDate) return false;
    return this.formatDate(date) === this.selectedDate;
  }

  getEventsForDay(date: Date | null): CalendarEvent[] {
    if (!date) return [];
    return this.events.filter(e => e.date === this.formatDate(date));
  }

  getDotsForDay(date: Date | null): CalendarEvent[] {
    return this.getEventsForDay(date).slice(0, 4);
  }

  hasMoreEvents(date: Date | null): boolean {
    return this.getEventsForDay(date).length > 4;
  }

  get selectedDayEvents(): CalendarEvent[] {
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

  get monthEvents(): CalendarEvent[] {
    const prefix = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
    return this.events
      .filter(e => e.date.startsWith(prefix))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  toggleShowAll() { this.showAllEvents = !this.showAllEvents; }

  get totalEventsThisMonth(): number { return this.monthEvents.length; }

  // NUEVO: ícono según tipo de evento
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      medicine: 'medical-outline',
      vet:      'paw-outline',
      vaccine:  'shield-checkmark-outline',
      other:    'calendar-outline'
    };
    return icons[type] || 'calendar-outline';
  }

  // NUEVO: emite evento para navegar a crear evento
  onAddEvent() { this.addEvent.emit(); }

  onEdit(event: CalendarEvent, ev: Event) { ev.stopPropagation(); this.editEvent.emit(event); }
  onDelete(event: CalendarEvent, ev: Event) { ev.stopPropagation(); this.deleteEvent.emit(event); }

  // Modal
selectedEvent: CalendarEvent | null = null;

openEventModal(ev: CalendarEvent) {
  this.selectedEvent = ev;
}

closeEventModal() {
  this.selectedEvent = null;
}

// Calcula próxima dosis sumando intervalHours a la hora del evento
getNextDose(ev: CalendarEvent): string {
  if (!ev.intervalHours) return '';
  const [h, m] = ev.time.split(':').map(Number);
  const base = new Date();
  base.setHours(h, m, 0, 0);
  base.setHours(base.getHours() + ev.intervalHours);
  const hh = String(base.getHours()).padStart(2, '0');
  const mm = String(base.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Eventos del mes agrupados por fecha para la vista "todos"
get groupedMonthEvents(): { label: string; events: CalendarEvent[] }[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of this.monthEvents) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date)!.push(ev);
  }
  return Array.from(map.entries()).map(([date, events]) => ({
    label: this.formatDisplayDate(date),
    events
  }));
}



}