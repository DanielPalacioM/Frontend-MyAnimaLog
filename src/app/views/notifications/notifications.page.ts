import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { AppNotification } from 'src/app/shared/components/notification-card/notification-card.component';
import { NotificationService } from 'src/app/services/NotificationService/notification';
import { PetService, Pet } from 'src/app/services/PetService/pet';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';
import { AppNotificationDto } from 'src/app/models/notification.model';
import { PetInvitation } from 'src/app/models/shared-profile.model';
import { dedupeByContent, humanizeNotification, isNoiseNotification } from 'src/app/shared/utils/notification-text.util';



// Prefijo para distinguir las tarjetas que salen de invitaciones pendientes
// (GET /pets/invitations/pending) de las notificaciones normales.
const INVITATION_PREFIX = 'inv:';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {

  notifications: AppNotification[] = [];
  showHidden: boolean = false;
  loading: boolean = false;
  loadError: boolean = false;

  // "Ver más" al estilo Gmail: en vez de pintar de una las notificaciones
  // (pueden ser cientos), se muestran de a poco.
  readonly pageSize = 15;
  visibleCount = this.pageSize;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private petService: PetService,
    private sharedProfileService: SharedProfileService,
    private profileService: ProfileService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  // Se vuelve a cargar cada vez que se entra a la vista (Ionic), así se
  // reflejan notificaciones nuevas que hayan llegado mientras el usuario
  // estaba en otra pantalla.
  ionViewWillEnter() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;

    forkJoin({
      // Reintenta una vez sola antes de rendirse: si el gateway responde con
      // un glitch pasajero (ej. varias pantallas pidiendo cosas a la vez),
      // no queremos vaciar la lista por eso. Si de plano falla, "notifications"
      // llega como null y se conserva lo que ya había en pantalla.
      notifications: this.notificationService.getNotifications().pipe(
        retry(1),
        catchError((err) => {
          console.error('❌ Error cargando notificaciones (se conserva lo que había en pantalla):', err);
          this.loadError = true;
          return of(null);
        })
      ),
      myPets: this.petService.getPets().pipe(catchError(() => of([]))),
      petsInCare: this.sharedProfileService.getPetsInMyCare().pipe(catchError(() => of([]))),
      // El backend guarda la invitación solo con el email y no crea una
      // notificación para el invitado, así que se traen aparte.
      invitations: this.sharedProfileService.getMyPendingInvitations().pipe(
        catchError((err) => {
          console.error('❌ Error cargando invitaciones pendientes:', err);
          return of([] as PetInvitation[]);
        })
      )
    }).subscribe(({ notifications, myPets, petsInCare, invitations }) => {
      this.loading = false;

      if (notifications === null) {
        return; // el GET falló y ya se conservó la lista anterior
      }

      this.loadError = false;

      const idToName = new Map<string, string>();
      [...myPets, ...petsInCare].forEach(p => idToName.set(p.id, p.name));

      const mapped = notifications
        .filter(n => !isNoiseNotification(n))
        .map(n => this.toAppNotification(n, idToName));

      const { deduped, redundantIds } = dedupeByContent(mapped);
      const invitationCards = invitations.map(i => this.invitationToAppNotification(i, idToName));
      this.notifications = [...invitationCards, ...deduped];
      invitations.forEach(i => this.enrichInvitation(i));
      this.visibleCount = this.pageSize;

      // El backend a veces mete varias copias exactas de la misma
      // notificación para un mismo evento (mismo type/título/mensaje). Ya se
      // ocultaron aquí; las que estaban sin leer se marcan leídas solas para
      // que no sigan inflando el contador del Home (las que ya estaban leídas
      // no hace falta volver a tocarlas).
      const unreadRedundantIds = redundantIds.filter(id => {
        const original = mapped.find(n => n.id === id);
        return original && !original.isRead;
      });
      if (unreadRedundantIds.length > 0) {
        this.notificationService.markManyAsRead(unreadRedundantIds).subscribe({
          error: (err) => console.error('❌ No se pudieron limpiar notificaciones duplicadas:', err)
        });
      }
    });
  }

  private toAppNotification(n: AppNotificationDto, idToName: Map<string, string>): AppNotification {
    const { title, message } = humanizeNotification(n, idToName);

    return {
      id: n.id,
      type: n.type,
      title,
      message,
      date: new Date(n.sendAt || n.createdAt),
      isRead: n.read,
      hidden: false
      // No seteamos "actions: 'invitation'" porque el backend no manda el id
      // de la invitación dentro de la notificación, así que no hay forma
      // segura de aceptar/rechazar directamente desde aquí todavía.
    };
  }

  private invitationToAppNotification(i: PetInvitation, idToName: Map<string, string>): AppNotification {
    const petName = i.petName || idToName.get(i.petId);
    return {
      // Se guarda el token (no el id): es lo que piden accept/reject.
      id: INVITATION_PREFIX + i.token,
      type: 'PET_INVITATION',
      ...this.invitationTexts(petName, i.ownerName, i.accessRole),
      date: i.createdAt ? new Date(i.createdAt) : new Date(),
      isRead: false,
      hidden: false,
      actions: 'invitation',
      petImageUrl: i.petImageUrl ?? null,
      senderName: i.ownerName,
      senderAvatarUrl: i.ownerAvatarUrl ?? null
    };
  }

  private invitationTexts(petName: string | undefined, senderName: string | undefined, role: string) {
    const roleText = role === 'EDITOR' ? 'editor' : 'solo vista';
    const who = senderName || 'Alguien';
    return {
      title: petName ? `Invitación para cuidar a ${petName}` : 'Invitación para cuidar una mascota',
      message: `${who} te invitó a cuidar a ${petName || 'su mascota'} con permiso de ${roleText}.`
    };
  }

  // Completa la tarjeta con lo que la invitación no trae: nombre y foto de
  // la mascota (GET /pets/{id}) y nombre y foto de quien invita (perfil del
  // dueño). Si el backend ya lo manda en la invitación, no se pide nada.
  private enrichInvitation(i: PetInvitation) {
    const needPet = !i.petName || !i.petImageUrl || !i.ownerId;
    const pet$ = needPet
      ? this.petService.getPetById(i.petId).pipe(catchError(() => of(null as Pet | null)))
      : of(null as Pet | null);

    pet$.pipe(
      switchMap(pet => {
        const ownerId = i.ownerId || pet?.ownerId || '';
        const owner$ = i.ownerName
          ? of({ id: ownerId, username: i.ownerName, avatarUrl: i.ownerAvatarUrl ?? null })
          : this.profileService.getUserById(ownerId);
        return owner$.pipe(map(owner => ({ pet, owner })));
      })
    ).subscribe(({ pet, owner }) => {
      const id = INVITATION_PREFIX + i.token;
      const petName = i.petName || pet?.name;
      const senderName = owner?.username || undefined;
      this.notifications = this.notifications.map(n => n.id !== id ? n : {
        ...n,
        ...this.invitationTexts(petName, senderName, i.accessRole),
        petImageUrl: i.petImageUrl || pet?.imageUrl || null,
        senderName,
        senderAvatarUrl: owner?.avatarUrl ?? null
      });
    });
  }

  private isInvitation(id: string): boolean {
    return id.startsWith(INVITATION_PREFIX);
  }

  private get filteredNotifications(): AppNotification[] {
    const list = this.showHidden
      ? this.notifications
      : this.notifications.filter(n => !n.hidden);

    // Más recientes primero.
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  get visibleNotifications(): AppNotification[] {
    return this.filteredNotifications.slice(0, this.visibleCount);
  }

  get hasMore(): boolean {
    return this.filteredNotifications.length > this.visibleCount;
  }

  loadMore() {
    this.visibleCount += this.pageSize;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  toggleHidden() {
    this.showHidden = !this.showHidden;
    this.visibleCount = this.pageSize;
  }

  markAllAsRead() {
    // Las invitaciones no son notificaciones del backend: siguen sin leer
    // hasta que se acepten o rechacen.
    const unread = this.notifications.filter(n => !n.isRead && !this.isInvitation(n.id));
    if (unread.length === 0) return;

    // Optimista: se ve el cambio de inmediato en la UI.
    this.notifications = this.notifications.map(n =>
      this.isInvitation(n.id) ? n : { ...n, isRead: true }
    );

    this.notificationService.markManyAsRead(unread.map(n => n.id)).subscribe({
      next: (results) => {
        const failedIds = new Set(results.filter(r => !r.ok).map(r => r.id));
        if (failedIds.size === 0) return;

        console.error(`❌ No se pudieron marcar como leídas ${failedIds.size} notificaciones, se revierten esas:`, [...failedIds]);
        // Solo revertimos las que de verdad fallaron; las demás quedan leídas.
        this.notifications = this.notifications.map(n =>
          failedIds.has(n.id) ? { ...n, isRead: false } : n
        );
      },
      error: (err) => console.error('❌ Error marcando todas como leídas:', err)
    });
  }

  onAccepted(id: string) {
    this.respondInvitation(id, true);
  }

  onRejected(id: string) {
    this.respondInvitation(id, false);
  }

  private respondInvitation(id: string, accept: boolean) {
    if (!this.isInvitation(id)) {
      this.notifications = this.notifications.filter(n => n.id !== id);
      return;
    }

    const invitationToken = id.slice(INVITATION_PREFIX.length);
    const request$ = accept
      ? this.sharedProfileService.acceptInvitation(invitationToken)
      : this.sharedProfileService.rejectInvitation(invitationToken);

    request$.subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => {
        console.error(`❌ Error ${accept ? 'aceptando' : 'rechazando'} invitación:`, err);
        alert(`No se pudo ${accept ? 'aceptar' : 'rechazar'} la invitación.`);
      }
    });
  }

  onMarkRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (!notif || notif.isRead || this.isInvitation(id)) return;

    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );

    this.notificationService.markAsRead(id).subscribe({
      error: (err) => {
        console.error('❌ Error marcando notificación como leída:', err);
        // revertimos si el backend no pudo marcarla
        this.notifications = this.notifications.map(n =>
          n.id === id ? { ...n, isRead: false } : n
        );
      }
    });
  }

  // Ocultar / Eliminar / Completada todavía no tienen endpoint en el backend
  // de notificaciones, así que por ahora solo actualizan el estado local
  // (se resetea al recargar la vista).
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
    this.router.navigate(['/home']);
  }
}
