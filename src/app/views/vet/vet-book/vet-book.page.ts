import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  Appointment,
  AppointmentError,
  Availability,
  BookableService,
  DaySlots,
  TimeSlot,
} from 'src/app/models/appointment.model';
import { LinkedVet, VetError } from 'src/app/models/veterinary.model';
import { AppointmentService } from 'src/app/services/AppointmentService/appointment';
import { PetService } from 'src/app/services/PetService/pet';
import { VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';
import {
  STATUS_VIEW,
  addDaysKey,
  appointmentErrorText,
  dateKey,
  dayLabel,
  duration,
  firstBookableDay,
  money,
  slotBookable,
  stripDay,
  timeLabel,
} from 'src/app/shared/utils/appointment.util';
import { petSubtitle, vetErrorText } from 'src/app/shared/utils/vet.util';

interface OwnPet { id: string; name: string; subtitle: string; shared: boolean; }
interface StripDay { key: string; name: string; num: number; hasSlots: boolean; }

export type BookStep = 1 | 2 | 3;

/**
 * Pedir cita (Figma 2034:225, 2034:282, 2034:361): servicio → fecha y hora → mascota y confirmar.
 * Con `?appointmentId=` reprograma esa cita: salta directo a elegir otra hora.
 *
 * Reglas: solo mascotas propias; si la elegida no está compartida con la clínica se comparte y se sigue
 * ("Compartir a Milor y continuar"); sin franjas con menos de 1 hora de anticipación; el precio queda fijo en la cita.
 * Si el servidor aún no tiene `availability`, las horas son una cuadrícula local y la clínica confirma.
 */
@Component({
  selector: 'app-vet-book',
  templateUrl: './vet-book.page.html',
  styleUrls: ['./vet-book.page.scss'],
  standalone: false
})
export class VetBookPage {
  vetId = '';
  appointmentId = '';
  vet: LinkedVet | null = null;

  step: BookStep = 1;
  loading = true;
  loadError: { title: string; detail: string } | null = null;

  services: BookableService[] = [];
  service: BookableService | null = null;

  pets: OwnPet[] = [];
  petId = '';
  notes = '';

  stripStart = '';
  availability: Availability | null = null;
  loadingSlots = false;
  slotsError: { title: string; detail: string } | null = null;
  dayKey = '';
  slot: TimeSlot | null = null;

  error: { title: string; detail: string } | null = null;
  submitting = false;
  result: Appointment | null = null;

  /** Cita que se está reprogramando, si la hay. */
  moving: Appointment | null = null;

  readonly status = STATUS_VIEW;
  readonly money = money;
  readonly duration = duration;
  readonly timeLabel = timeLabel;
  readonly dayLabel = dayLabel;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointments: AppointmentService,
    private vetService: VeterinaryService,
    private petService: PetService
  ) {}

  ionViewWillEnter(): void {
    this.vetId = this.route.snapshot.paramMap.get('vetId') ?? '';
    this.appointmentId = this.route.snapshot.queryParamMap.get('appointmentId') ?? '';
    this.reset();
    this.load();
  }

  get rescheduling(): boolean { return !!this.appointmentId; }

  private reset(): void {
    this.step = 1;
    this.service = null;
    this.petId = '';
    this.notes = '';
    this.slot = null;
    this.dayKey = '';
    this.availability = null;
    this.error = null;
    this.result = null;
    this.moving = null;
  }

  // ---------------------------------------------------------------- Carga

  load(): void {
    this.loading = true;
    this.loadError = null;
    forkJoin({
      vets: this.vetService.getLinked(),
      services: this.appointments.getServices(this.vetId),
      pets: this.petService.getPets(),
      mine: this.rescheduling ? this.appointments.getMine() : of([] as Appointment[]),
    }).pipe(
      switchMap(r =>
        this.vetService.loadSharing(r.pets.filter(p => !p.inCare).map(p => ({ id: p.id, name: p.name }))).pipe(
          catchError(() => of(new Map())),
          map(sharing => ({ ...r, sharing }))
        )
      )
    ).subscribe({
      next: ({ vets, services, pets, mine, sharing }) => {
        this.vet = vets.find(v => v.veterinaryId === this.vetId) ?? null;
        this.services = services;
        const sharedIds = new Set((sharing.get(this.vetId) ?? []).map((p: { id: string }) => p.id));
        this.pets = pets.filter(p => !p.inCare).map(p => ({
          id: p.id, name: p.name, subtitle: petSubtitle(p), shared: sharedIds.has(p.id),
        }));
        if (this.pets.length === 1) this.petId = this.pets[0].id;
        this.loading = false;
        if (!this.vet) {
          this.loadError = { title: 'Ya no estás vinculado a esta clínica', detail: 'Vuelve a vincularte con su código para pedir una cita.' };
          return;
        }
        if (this.rescheduling) this.startReschedule(mine.find(a => a.id === this.appointmentId) ?? null);
      },
      error: (e: AppointmentError | VetError) => {
        console.error('❌ Pedir cita: no se pudo cargar', e);
        this.loadError = isVetError(e) ? vetErrorText(e) : appointmentErrorText(e);
        this.loading = false;
      }
    });
  }

  private startReschedule(a: Appointment | null): void {
    if (!a) {
      this.loadError = { title: 'No encontramos esa cita', detail: 'Puede que ya no exista. Revisa Mis citas.' };
      return;
    }
    this.moving = a;
    this.service = { id: a.serviceId, name: a.serviceName, durationMinutes: a.durationMinutes, price: a.price };
    this.step = 2;
    this.loadSlots(dateKey(Date.now()));
  }

  // ---------------------------------------------------------------- Paso 1: servicio

  pickService(s: BookableService): void {
    this.service = s;
    this.slot = null;
    this.step = 2;
    this.loadSlots(dateKey(Date.now()));
  }

  // ---------------------------------------------------------------- Paso 2: fecha y hora

  /** Pide la tira de 5 días que empieza en `fromKey` y deja abierto el primer día con horas libres. */
  loadSlots(fromKey: string): void {
    if (!this.service) return;
    this.stripStart = fromKey;
    this.loadingSlots = true;
    this.slotsError = null;
    this.appointments.getAvailability(this.vetId, this.service.id, this.service.durationMinutes, fromKey).subscribe({
      next: av => {
        this.availability = av;
        this.dayKey = firstBookableDay(av.days) ?? av.days[0]?.date ?? '';
        this.slot = null;
        this.loadingSlots = false;
      },
      error: (e: AppointmentError) => {
        console.error('❌ Pedir cita: no se pudieron leer las horas', e);
        this.slotsError = appointmentErrorText(e);
        this.availability = null;
        this.loadingSlots = false;
      }
    });
  }

  get strip(): StripDay[] {
    return (this.availability?.days ?? []).map(d => ({
      key: d.date, ...stripDay(d.date), hasSlots: d.slots.some(s => slotBookable(s)),
    }));
  }

  get today(): string { return dateKey(Date.now()); }
  get canGoBack(): boolean { return this.stripStart > this.today; }

  shift(direction: 1 | -1): void {
    const next = addDaysKey(this.stripStart, direction * 5);
    this.loadSlots(next < this.today ? this.today : next);
  }

  get day(): DaySlots | null {
    return this.availability?.days.find(d => d.date === this.dayKey) ?? null;
  }

  get daySlots(): { slot: TimeSlot; ok: boolean }[] {
    return (this.day?.slots ?? []).map(s => ({ slot: s, ok: slotBookable(s) }));
  }

  get freeHoursTitle(): string {
    const d = this.day;
    return d ? `Horas libres el ${dayLabel(d.date + 'T12:00:00-05:00')}` : 'Horas libres';
  }

  /** La clínica confirma la hora: se avisa cuando las franjas son una guía local y no del servidor. */
  get gridNote(): boolean { return this.availability?.source === 'grid'; }

  pickDay(key: string): void {
    this.dayKey = key;
    this.slot = null;
  }

  pickSlot(s: TimeSlot): void {
    this.slot = s;
    this.error = null;
  }

  isPicked(s: TimeSlot): boolean { return this.slot?.startsAt === s.startsAt; }

  /** Avanza del paso 2 al 3 (o, al reprogramar, confirma directo). */
  continueFromSlots(): void {
    if (!this.slot) return;
    if (this.rescheduling) { this.confirm(); return; }
    this.step = 3;
  }

  // ---------------------------------------------------------------- Paso 3: mascota y confirmar

  get pet(): OwnPet | null { return this.pets.find(p => p.id === this.petId) ?? null; }

  pickPet(p: OwnPet): void {
    this.petId = p.id;
    this.error = null;
  }

  /** "Compartir a Milor y continuar" cuando la clínica aún no ve a la mascota. */
  get confirmLabel(): string {
    if (this.submitting) return this.rescheduling ? 'Reprogramando...' : 'Pidiendo la cita...';
    if (this.rescheduling) return 'Reprogramar cita';
    const p = this.pet;
    return p && !p.shared ? `Compartir a ${p.name} y pedir cita` : 'Pedir cita';
  }

  get canConfirm(): boolean {
    if (this.submitting || !this.slot || !this.service) return false;
    return this.rescheduling || !!this.pet;
  }

  back(): void {
    this.error = null;
    if (this.rescheduling || this.step === 1) { this.router.navigate([this.rescheduling ? '/vet/appointments' : '/vet/detail', ...(this.rescheduling ? [] : [this.vetId])]); return; }
    this.step = (this.step - 1) as BookStep;
  }

  confirm(): void {
    if (!this.canConfirm || !this.slot || !this.service) return;
    this.submitting = true;
    this.error = null;

    const call$: Observable<Appointment> = this.rescheduling
      ? this.appointments.reschedule(this.vetId, this.appointmentId, this.slot.startsAt)
      : this.requestSharing();

    call$.subscribe({
      next: a => {
        this.submitting = false;
        this.result = a;
      },
      error: (e: AppointmentError | VetError) => {
        console.error('❌ Pedir cita', e);
        this.submitting = false;
        this.handleError(e);
      }
    });
  }

  /** Comparte la mascota si hace falta y pide la cita; si el servidor aún dice `PET_NOT_SHARED`, comparte y reintenta una vez. */
  private requestSharing(): Observable<Appointment> {
    const pet = this.pet!;
    const body = { serviceId: this.service!.id, petId: pet.id, startsAt: this.slot!.startsAt, notes: this.notes };
    const share$ = this.vetService.sharePets(this.vetId, [pet.id]).pipe(map(() => { pet.shared = true; }));
    const request$ = this.appointments.request(this.vetId, body);
    const first$ = pet.shared ? request$ : share$.pipe(switchMap(() => request$));
    return first$.pipe(
      catchError((e: AppointmentError) =>
        e.code === 'PET_NOT_SHARED' && pet.shared
          ? share$.pipe(switchMap(() => request$))
          : throwError(() => e)
      )
    );
  }

  private handleError(e: AppointmentError | VetError): void {
    const code = (e as { code: string }).code;
    this.error = isVetError(e) ? vetErrorText(e) : appointmentErrorText(e);
    // La hora se ocupó o quedó muy cerca: se vuelve a elegir hora con las franjas al día.
    if (code === 'SLOT_UNAVAILABLE' || code === 'SLOT_TAKEN' || code === 'SLOT_TOO_SOON') {
      this.step = 2;
      this.loadSlots(this.stripStart || this.today);
    }
  }

  // ---------------------------------------------------------------- Resultado

  get resultTitle(): string {
    if (this.rescheduling) return 'Cita reprogramada';
    return this.result?.status === 'CONFIRMED' ? '¡Cita confirmada!' : 'Pedido enviado';
  }

  get resultText(): string {
    const a = this.result;
    const clinic = this.vet?.name ?? 'la clínica';
    if (!a) return '';
    if (a.status === 'REQUESTED') return `${clinic} tiene que confirmar tu cita. Te avisamos apenas responda.`;
    return `${clinic} te espera el ${dayLabel(a.startsAt)} a las ${timeLabel(a.startsAt)}.`;
  }

  goAppointments(): void { this.router.navigate(['/vet/appointments'], { replaceUrl: true }); }
  goVet(): void { this.router.navigate(['/vet/detail', this.vetId], { replaceUrl: true }); }
  goBackHome(): void { this.router.navigate(['/vet']); }
}

/** Los errores del veterinary-service (vincular, compartir) traen códigos propios; los de citas, los suyos. */
function isVetError(e: AppointmentError | VetError): e is VetError {
  const code = (e as { code: string }).code;
  return ['INVALID_INVITE_CODE', 'LINK_CODE_NOT_FOUND', 'NOT_LINKED_TO_VETERINARY', 'CLINIC_NOT_ACTIVE', 'USER_NOT_LINKED', 'VETERINARY_NOT_FOUND'].includes(code);
}
