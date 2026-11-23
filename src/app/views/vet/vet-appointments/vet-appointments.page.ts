import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Appointment, AppointmentError } from 'src/app/models/appointment.model';
import { AppointmentService } from 'src/app/services/AppointmentService/appointment';
import {
  STATUS_VIEW,
  appointmentErrorText,
  canCancel,
  dayLabel,
  dayShort,
  duration,
  isOpen,
  money,
  splitAppointments,
  timeLabel,
  whyNotCancellable,
} from 'src/app/shared/utils/appointment.util';

type State = 'loading' | 'ready' | 'error';

/**
 * Mis citas: las próximas y las anteriores, en todas las clínicas (o solo en una con `?veterinaryId=`).
 * Cada cita muestra su estado con texto e ícono. Cancelar y reprogramar se bloquean fuera de plazo y explican por qué,
 * en vez de dejar el botón mudo y esperar el error del servidor.
 */
@Component({
  selector: 'app-vet-appointments',
  templateUrl: './vet-appointments.page.html',
  styleUrls: ['./vet-appointments.page.scss'],
  standalone: false
})
export class VetAppointmentsPage {
  state: State = 'loading';
  error: { title: string; detail: string } | null = null;

  upcoming: Appointment[] = [];
  past: Appointment[] = [];
  /** Si viene, solo se ven las citas de esa clínica. */
  veterinaryId = '';

  /** Cita que se está cancelando (hoja inferior). */
  cancelling: Appointment | null = null;
  reason = '';
  busy = false;
  actionError: { title: string; detail: string } | null = null;

  readonly status = STATUS_VIEW;
  readonly money = money;
  readonly duration = duration;
  readonly timeLabel = timeLabel;
  readonly dayLabel = dayLabel;
  readonly isOpen = isOpen;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointments: AppointmentService,
    private toast: ToastController
  ) {}

  ionViewWillEnter(): void {
    this.veterinaryId = this.route.snapshot.queryParamMap.get('veterinaryId') ?? '';
    this.load();
  }

  load(): void {
    this.state = 'loading';
    this.error = null;
    this.appointments.getMine().subscribe({
      next: list => {
        const mine = this.veterinaryId ? list.filter(a => a.veterinaryId === this.veterinaryId) : list;
        const { upcoming, past } = splitAppointments(mine);
        this.upcoming = upcoming;
        this.past = past;
        this.state = 'ready';
      },
      error: (e: AppointmentError) => {
        console.error('❌ Mis citas: no se pudieron cargar', e);
        this.error = appointmentErrorText(e);
        this.state = 'error';
      }
    });
  }

  get empty(): boolean { return !this.upcoming.length && !this.past.length; }

  when(a: Appointment): string { return `${dayShort(a.startsAt)} · ${timeLabel(a.startsAt)}`; }

  canAct(a: Appointment): boolean { return canCancel(a); }
  whyNot(a: Appointment): string { return whyNotCancellable(a); }

  /** Texto de apoyo según cómo terminó la cita. */
  detail(a: Appointment): string {
    if (a.status === 'REJECTED') return a.cancellationReason ? `La clínica no pudo atenderla: ${a.cancellationReason}` : 'La clínica no pudo atenderla.';
    if (a.status === 'CANCELLED') {
      const by = a.cancelledBy === 'CLINIC' ? 'La clínica la canceló' : 'La cancelaste';
      return a.cancellationReason ? `${by}: ${a.cancellationReason}` : `${by}.`;
    }
    if (a.status === 'REQUESTED') return 'La clínica tiene que confirmarla.';
    return '';
  }

  // ---------------------------------------------------------------- Acciones

  book(): void { this.router.navigate(['/vet']); }

  reschedule(a: Appointment): void {
    this.router.navigate(['/vet/book', a.veterinaryId], { queryParams: { appointmentId: a.id } });
  }

  openCancel(a: Appointment): void {
    this.cancelling = a;
    this.reason = '';
    this.actionError = null;
  }

  closeCancel(): void { if (!this.busy) this.cancelling = null; }

  confirmCancel(): void {
    const a = this.cancelling;
    if (!a || this.busy) return;
    this.busy = true;
    this.actionError = null;
    this.appointments.cancel(a.veterinaryId, a.id, this.reason).subscribe({
      next: async () => {
        this.busy = false;
        this.cancelling = null;
        await this.showToast('Cita cancelada');
        this.load();
      },
      error: (e: AppointmentError) => {
        console.error('❌ Cancelar cita', e);
        this.busy = false;
        this.actionError = appointmentErrorText(e);
        // Si el plazo venció mientras tanto, se refresca la lista para que el botón ya salga bloqueado.
        if (e.code === 'CANCELLATION_WINDOW_CLOSED') this.load();
      }
    });
  }

  goBack(): void { this.router.navigate(['/vet']); }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2400, position: 'bottom' });
    await t.present();
  }
}
