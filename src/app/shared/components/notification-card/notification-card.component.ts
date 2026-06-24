import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface AppNotification {
  id: string;
  type: 'invitation' | 'medicine' | 'routine' | 'vet-appointment' | 'vet-message' | 'calendar';
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
  hidden?: boolean;
  actions?: 'invitation';
}

@Component({
  selector: 'app-notification-card',
  templateUrl: './notification-card.component.html',
  styleUrls: ['./notification-card.component.scss'],
  standalone: false
})
export class NotificationCardComponent {
  @Input() notification!: AppNotification;
  @Output() accepted  = new EventEmitter<string>();
  @Output() rejected  = new EventEmitter<string>();
  @Output() markRead  = new EventEmitter<string>();
  @Output() hidden    = new EventEmitter<string>();
  @Output() deleted   = new EventEmitter<string>();
  @Output() completed = new EventEmitter<string>();

  menuOpen: boolean = false;

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  onAccept()   { this.accepted.emit(this.notification.id); }
  onReject()   { this.rejected.emit(this.notification.id); }
  onMarkRead() { this.markRead.emit(this.notification.id); this.menuOpen = false; }
  onHide()     { this.hidden.emit(this.notification.id);   this.menuOpen = false; }
  onDelete()   { this.deleted.emit(this.notification.id);  this.menuOpen = false; }
  onComplete() { this.completed.emit(this.notification.id); this.menuOpen = false; }

  getNotifDate(): string {
  const now = new Date();
  const eventDate = this.notification.date;

  const isToday = now.toDateString() === eventDate.toDateString();
  const dayLabel = isToday ? 'Hoy' : eventDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const hour = eventDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${dayLabel} · ${hour}`;
}
}