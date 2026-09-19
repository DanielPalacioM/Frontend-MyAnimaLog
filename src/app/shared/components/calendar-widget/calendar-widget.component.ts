import { Component, Input } from '@angular/core';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date | null;
  type: 'medicine' | 'vet' | 'vaccine' | 'other';
}

@Component({
  selector: 'app-calendar-widget',
  templateUrl: './calendar-widget.component.html',
  styleUrls: ['./calendar-widget.component.scss'],
  standalone: false
})
export class CalendarWidgetComponent {

  @Input() events: CalendarEvent[] = [];

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      medicine: 'medkit-outline',
      vet: 'medical-outline',
      vaccine: 'bandage-outline',
      other: 'calendar-outline'
    };
    return icons[type] || 'calendar-outline';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      medicine: '#f5a623',
      vet: '#4a90e2',
      vaccine: '#7ed321',
      other: '#9b9b9b'
    };
    return colors[type] || '#9b9b9b';
  }
}