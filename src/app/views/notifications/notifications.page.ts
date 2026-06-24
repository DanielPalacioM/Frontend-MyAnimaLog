import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from 'src/app/shared/components/notification-card/notification-card.component';



@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {

  notifications: AppNotification[] = [];
  showHidden: boolean = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    // TODO: conectar con backend
    this.notifications = [
      {
        id: '1',
        type: 'invitation',
        title: 'Invitaciones',
        message: '¿Juan te gustaría invitarte a cuidar a tu mascota Milo?',
        date: new Date('2024-04-07T10:00:00'),
        isRead: false,
        hidden: false,
        actions: 'invitation'
      },
      {
        id: '2',
        type: 'medicine',
        title: 'Medicina',
        message: 'Vacuna de Milo próxima a vencer, vence el día x',
        date: new Date('2024-04-07T11:05:00'),
        isRead: true,
        hidden: false
      },
      {
        id: '3',
        type: 'routine',
        title: 'Rutinas',
        message: 'En 5 min empieza la hora del baño',
        date: new Date('2024-04-07T15:00:00'),
        isRead: false,
        hidden: false
      },
      {
        id: '4',
        type: 'invitation',
        title: 'Invitaciones',
        message: 'Text Text Text Text Text',
        date: new Date('2024-04-07T16:00:00'),
        isRead: false,
        hidden: false
      },
      {
        id: '5',
        type: 'medicine',
        title: 'Medicina',
        message: 'Text Text Text Text Text',
        date: new Date('2024-04-07T17:00:00'),
        isRead: false,
        hidden: false
      },
      {
        id: '6',
        type: 'calendar',
        title: 'Cita medica',
        message: 'Mañana es tu cita con el veterinario - prueba del...',
        date: new Date('2024-04-07T18:00:00'),
        isRead: false,
        hidden: false
      },
      {
        id: '7',
        type: 'vet-message',
        title: 'Veterinaria',
        message: 'Resultados de milo, exámenes de sangre',
        date: new Date('2024-04-07T19:00:00'),
        isRead: false,
        hidden: false
      }
    ];
  }

  get visibleNotifications(): AppNotification[] {
    const list = this.showHidden
      ? this.notifications
      : this.notifications.filter(n => !n.hidden);

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  toggleHidden() {
    this.showHidden = !this.showHidden;
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
  }

  onAccepted(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  onRejected(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  onMarkRead(id: string) {
    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
  }

  onHidden(id: string) {
    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, hidden: true } : n
    );
  }

  onDeleted(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  onCompleted(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}