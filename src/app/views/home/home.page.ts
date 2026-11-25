import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CalendarEvent } from '../../shared/components/calendar-widget/calendar-widget.component';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import { PetService, Pet } from 'src/app/services/PetService/pet';
import { NotificationService } from 'src/app/services/NotificationService/notification';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';
import { SharedPet } from 'src/app/models/shared-profile.model';
import { TutorialService, TutorialKey, TutorialStep, TutorialSlide } from 'src/app/services/TutorialService/tutorial';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { AppointmentService } from 'src/app/services/AppointmentService/appointment';
import { VaccineService } from 'src/app/services/VaccineService/vaccine/vaccine';
import { PetHealthService } from 'src/app/services/PetHealthService/pet-health';
import { VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';
import { CalendarService } from 'src/app/services/CalendarService/calendar';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { Appointment } from 'src/app/models/appointment.model';
import { LinkedVet } from 'src/app/models/veterinary.model';
import {
  GreetingView, PetChip, PreventionLite, TodayItem, VaccineLite, WeekDay, buildGreeting, buildTodayItems, petChip, petLine, weekDays,
} from 'src/app/shared/utils/home-today.util';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {

  username: string = 'Username';
  userAvatar: string = 'assets/images/default-avatar.svg';
  hasPets: boolean = false;
  currentPetIndex: number = 0;
  activeQuickItem: string | null = null;

  // Tutorial interactivo y con imágenes
  tourOpen = false;
  tourSteps: TutorialStep[] = [];
  private tourKeys: TutorialKey[] = [];
  galleryOpen = false;
  gallerySlides: TutorialSlide[] = [];

  pets: Pet[] = [];
  upcomingEvents: CalendarEvent[] = [];
  unreadNotificationsCount: number = 0;

  // Menú de tres líneas del header
  menuOpen = false;

  // Saludo del día, "Para hoy", la semana y la veterinaria asociada
  greeting: GreetingView | null = null;
  /** Entrada animada del perrito: una vez por sesión. */
  greetAnimate = false;
  todayItems: TodayItem[] = [];
  week: WeekDay[] = weekDays(new Date(), [], []);
  weekNote = '';
  linkedVet: LinkedVet | null = null;
  linkedVetLine = '';
  private todayLoaded = false;
  /** Chip de salud de cada mascota (tarjetas de "Tus mascotas"). */
  petChips: Record<string, PetChip> = {};

  // --- Swipe / carrusel state ---
  @ViewChild('swipeContainer') swipeContainerRef!: ElementRef<HTMLDivElement>;

  private touchStartX = 0;
  private containerWidth = 300; // fallback, se actualiza en runtime
  currentTranslateX = 0; // en porcentaje del ancho del contenedor
  isDragging = false;
  cardTransition = 'none';

  private unreadCountSub?: Subscription;

  constructor(
    public router: Router,
    private profileService: ProfileService,
    private petService: PetService,
    private notificationService: NotificationService,
    private sharedProfileService: SharedProfileService,
    private tutorialService: TutorialService,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private appointmentService: AppointmentService,
    private vaccineService: VaccineService,
    private petHealth: PetHealthService,
    private vetService: VeterinaryService,
    private calendarService: CalendarService,
    private aiAccess: AiAccessService
  ) {}


  ngOnInit() {
    try {
      this.greetAnimate = sessionStorage.getItem('homeGreeted') !== '1';
      sessionStorage.setItem('homeGreeted', '1');
    } catch { /* sin animación */ }
    this.loadLinkedVet();
    this.loadUserData();
    this.loadPets();
    this.loadEvents();

    // El contador se mantiene al día solo: si desde Notificaciones (u otra
    // pantalla) se marca algo como leído, este valor baja de inmediato sin
    // que Home tenga que volver a pedirlo.
    this.unreadCountSub = this.notificationService.unreadCount$.subscribe(
      count => this.unreadNotificationsCount = count
    );
    this.notificationService.refreshUnreadCount();
  }

   ionViewWillEnter() {
    this.menuOpen = false;
    this.loadUserData();
    this.loadPets();
    this.notificationService.refreshUnreadCount();
  }

  ngOnDestroy() {
    this.unreadCountSub?.unsubscribe();
  }

  ngAfterViewInit() {
    if (this.swipeContainerRef) {
      this.containerWidth = this.swipeContainerRef.nativeElement.offsetWidth;
    }
  }

  /**
   * Usuario nuevo: explica botones y secciones. Si aún no tiene mascotas
   * cierra señalando "Add pet"; cuando agregue la primera, al volver al Home
   * se explica la tarjeta de la mascota (una sola vez).
   */
  private maybeStartTutorial() {
    if (this.tourOpen || this.galleryOpen) return;

    const keys: TutorialKey[] = [];
    if (!this.tutorialService.hasSeen('home-general')) {
      keys.push('home-general');
      if (!this.hasPets) keys.push('home-no-pets');
    }
    if (this.hasPets && !this.tutorialService.hasSeen('home-pets')) {
      keys.push('home-pets');
    }
    if (keys.length) this.startTour(keys);
  }

  private startTour(keys: TutorialKey[]) {
    this.tourKeys = keys;
    this.tourSteps = this.tutorialService.getSteps(...keys);
    this.tourOpen = true;
  }

  onTourClosed() {
    this.tourKeys.forEach(key => this.tutorialService.markSeen(key));
    this.tourKeys = [];
    this.tourOpen = false;
  }

  async openTutorialMenu() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Tutorial',
      buttons: [
        {
          text: 'Tutorial interactivo',
          icon: 'hand-left-outline',
          handler: () => {
            this.startTour(['home-general', this.hasPets ? 'home-pets' : 'home-no-pets']);
          }
        },
        {
          text: 'Tutorial con imágenes',
          icon: 'images-outline',
          handler: () => {
            this.gallerySlides = this.tutorialService.getGallery();
            this.galleryOpen = true;
          }
        },
        {
          text: 'Volver a ver las guías de cada sección',
          icon: 'refresh-outline',
          handler: () => {
            this.tutorialService.resetSections();
            this.showToast('Las guías se mostrarán de nuevo al entrar a cada sección.');
          }
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await toast.present();
  }

  loadUserData() {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.username = profile.username;
        if (this.todayLoaded) this.refreshGreeting();
        if (profile.profileImageUrl) {
          this.userAvatar = profile.profileImageUrl;
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  // Mis mascotas + las que me compartieron ("A mi cuidado"), en un solo carrusel.
  loadPets() {
    forkJoin({
      mine: this.petService.getPets(),
      inCare: this.sharedProfileService.getPetsInMyCare().pipe(
        catchError((err) => {
          console.error('❌ Error cargando mascotas a mi cuidado:', err);
          return of([] as SharedPet[]);
        })
      )
    }).subscribe({
      next: ({ mine, inCare }) => {
        const pets = [...mine, ...inCare.map(p => this.sharedPetToPet(p))];
        this.pets = pets;
        this.loadCaregivers(mine);
        this.hasPets = this.pets.length > 0;
        this.loadToday();
        if (this.currentPetIndex >= this.pets.length) {
          this.currentPetIndex = 0;
        }
        this.maybeStartTutorial();
      },
      error: (err) => {
        console.error('❌ Error cargando mascotas:', err);
        this.pets = [];
        this.hasPets = false;
        this.loadToday();
        this.maybeStartTutorial();
      }
    });
  }

  private sharedPetToPet(p: SharedPet): Pet {
    return {
      id: p.id,
      ownerId: p.ownerId,
      name: p.name,
      species: p.species,
      breed: p.breed,
      birthDate: p.birthDate || '',
      ageMonths: p.ageMonths ?? null,
      imageUrl: p.imageUrl,
      sex: p.sex,
      weight: p.weight ?? null,
      height: p.height ?? null,
      vaccine: null,
      documentIds: [],
      vetName: '',
      sharedWith: [],
      createdAt: '',
      inCare: true,
      accessRole: p.accessRole
    };
  }

  // "También lo cuida": fotos de las personas que aceptaron la invitación
  // de cada una de MIS mascotas.
  private loadCaregivers(myPets: Pet[]) {
    myPets.forEach(pet => {
      this.sharedProfileService.getPeopleWithAccessToPet(pet.id).pipe(
        switchMap(list => list.length === 0
          ? of([] as string[])
          : forkJoin(list.map(a => a.userAvatarUrl
              ? of(a.userAvatarUrl)
              : this.profileService.getUserById(a.userId).pipe(map(u => u?.avatarUrl || ''))
            ))
        ),
        catchError(() => of([] as string[]))
      ).subscribe(avatars => {
        const target = this.pets.find(p => p.id === pet.id && !p.inCare);
        if (target) {
          target.sharedWith = avatars.map(a => ({ avatarUrl: a || 'assets/images/default-avatar.svg' }));
        }
      });
    });
  }

  loadEvents() {
    this.upcomingEvents = [];
  }

  // ---------------------------------------------------------------- Saludo, Para hoy y semana

  /**
   * Junta lo que necesitan hoy las mascotas: citas con clínicas, vacunas y desparasitación.
   * Cada fuente falla por su cuenta (Calendar o Medical sin publicar no tumban el Home).
   */
  private loadToday(): void {
    const now = new Date();
    const pets = this.pets;
    const vaccines$ = pets.length
      ? forkJoin(pets.map(p => this.vaccineService.getVaccinesByPet(p.id).pipe(
          map(list => list.map((v): VaccineLite => ({
            petId: p.id, petName: p.name, name: v.name,
            applicationDate: (v.applicationDate || '').slice(0, 10), nextDoseDate: v.nextDoseDate ? v.nextDoseDate.slice(0, 10) : null,
          }))),
          catchError(() => of([] as VaccineLite[]))
        ))).pipe(map(parts => ([] as VaccineLite[]).concat(...parts)))
      : of([] as VaccineLite[]);
    const severe = new Set<string>();
    const prevention$ = pets.length
      ? forkJoin(pets.map(p => this.petHealth.getSummary(p.id).pipe(
          map(s => {
            if (s.allergies.some(a => (a.state === 'SUSPECTED' || a.state === 'CONFIRMED') && a.severity === 'SEVERE')) severe.add(p.id);
            return (['INTERNAL', 'EXTERNAL'] as const).map((k): PreventionLite => ({
              petId: p.id, petName: p.name, kind: k, state: s.prevention[k].state, nextDoseDate: s.prevention[k].nextDoseDate,
            }));
          }),
          catchError(() => of([] as PreventionLite[]))
        ))).pipe(map(parts => ([] as PreventionLite[]).concat(...parts)))
      : of([] as PreventionLite[]);
    forkJoin({
      vaccines: vaccines$,
      prevention: prevention$,
      appts: this.appointmentService.getMine(now.getTime(), 7, 30).pipe(catchError(() => of([] as Appointment[]))),
      events: this.calendarService.getAllUserEvents().pipe(catchError(() => of([] as any[]))),
    }).subscribe(({ vaccines, prevention, appts, events }) => {
      this.todayItems = buildTodayItems({ now, appointments: appts, vaccines, prevention });
      this.petChips = pets.reduce((acc, p) => ({ ...acc, [p.id]: petChip({
        now, severeAllergy: severe.has(p.id),
        vaccines: vaccines.filter(v => v.petId === p.id), prevention: prevention.filter(x => x.petId === p.id),
      }) }), {} as Record<string, PetChip>);
      const open = appts.filter(a => ['REQUESTED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status));
      this.week = weekDays(now, open.map(a => a.startsAt), (events as any[]).map(e => e.start_date).filter(Boolean));
      const inWeek = open
        .filter(a => this.week.some(d => d.key === new Date(a.startsAt).toLocaleDateString('en-CA')))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      this.weekNote = inWeek
        ? `${new Date(inWeek.startsAt).toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^./, c => c.toUpperCase())}: cita en ${inWeek.clinicName || 'la clínica'}`
        : '';
      this.todayLoaded = true;
      this.refreshGreeting();
    });
  }

  petLineOf(p: Pet): string { return petLine(p, new Date()); }

  private refreshGreeting(): void {
    const name = this.username && this.username !== 'Username' ? this.username : '';
    this.greeting = buildGreeting({
      name, now: new Date(),
      pets: this.pets.map(p => ({ id: p.id, name: p.name, birthDate: p.birthDate })),
      items: this.todayItems,
    });
  }

  onGreetingAction(cta: NonNullable<GreetingView['cta']>): void {
    if (cta.kind === 'addPet') { this.onAddPet(); return; }
    if (cta.kind === 'pet' && cta.petId) { this.router.navigate(['/pet-profile', cta.petId]); return; }
    document.getElementById('para-hoy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** El perrito es la cara de la IA: tocarlo abre el mini chat. */
  onDogTap(): void {
    if (this.aiAccess.canUseAi()) this.aiAccess.openMini();
  }

  openTodayItem(it: TodayItem): void {
    this.router.navigate(it.action.route, it.action.queryParams ? { queryParams: it.action.queryParams } : {});
  }

  // ---------------------------------------------------------------- Veterinaria asociada

  private loadLinkedVet(): void {
    this.vetService.getLinked().subscribe({
      next: list => {
        const v = list[0] ?? null;
        this.linkedVet = v;
        const n = v?.sharedPetsCount ?? 0;
        this.linkedVetLine = !v ? '' : n ? `Tu veterinaria · ve a ${n} ${n === 1 ? 'mascota' : 'mascotas'}` : 'Tu veterinaria';
      },
      error: err => { console.error('❌ Error cargando la veterinaria asociada:', err); this.linkedVet = null; }
    });
  }

  openLinkedVet(): void { if (this.linkedVet) this.router.navigate(['/vet/detail', this.linkedVet.veterinaryId]); }
  bookLinkedVet(): void { if (this.linkedVet) this.router.navigate(['/vet/book', this.linkedVet.veterinaryId]); }
  callLinkedVet(): void { if (this.linkedVet?.phone) window.open(`tel:${this.linkedVet.phone}`, '_self'); }

  get currentPet(): Pet {
    return this.pets[this.currentPetIndex];
  }

  get prevPetIndex(): number {
    if (this.pets.length <= 1) return this.currentPetIndex;
    return (this.currentPetIndex - 1 + this.pets.length) % this.pets.length;
  }

  get nextPetIndex(): number {
    if (this.pets.length <= 1) return this.currentPetIndex;
    return (this.currentPetIndex + 1) % this.pets.length;
  }

  private nextPet() {
    if (this.pets.length <= 1) return;
    this.currentPetIndex = (this.currentPetIndex + 1) % this.pets.length;
  }

  private prevPet() {
    if (this.pets.length <= 1) return;
    this.currentPetIndex =
      (this.currentPetIndex - 1 + this.pets.length) % this.pets.length;
  }

  // --- Touch events ---
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.isDragging = true;
    this.cardTransition = 'none';
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    const currentX = event.changedTouches[0].screenX;
    const deltaPx = currentX - this.touchStartX;
    this.currentTranslateX = (deltaPx / this.containerWidth) * 100;
  }

  onTouchEnd(event: TouchEvent) {
    this.finishDrag();
  }

  // --- Mouse events (para poder probar/usar en desktop) ---
  onMouseDown(event: MouseEvent) {
  event.preventDefault();
  this.touchStartX = event.screenX;
  this.isDragging = true;
  this.cardTransition = 'none';
}

  onMouseMove(event: MouseEvent) {
  if (!this.isDragging) return;
  const deltaPx = event.screenX - this.touchStartX;
  this.currentTranslateX = (deltaPx / this.containerWidth) * 100;
}

  onMouseUp(event: MouseEvent) {
    this.finishDrag();
  }

  private finishDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const thresholdPercent = 20; // % del ancho para completar el cambio
    this.cardTransition = 'transform 0.3s ease';

    if (this.currentTranslateX <= -thresholdPercent) {
      // completa el recorrido hacia la izquierda -> siguiente mascota
      this.currentTranslateX = -100;
      setTimeout(() => {
        this.nextPet();
        this.cardTransition = 'none';
        this.currentTranslateX = 0;
      }, 300);
    } else if (this.currentTranslateX >= thresholdPercent) {
      // completa el recorrido hacia la derecha -> mascota anterior
      this.currentTranslateX = 100;
      setTimeout(() => {
        this.prevPet();
        this.cardTransition = 'none';
        this.currentTranslateX = 0;
      }, 300);
    } else {
      // no llegó al umbral, regresa al centro
      this.currentTranslateX = 0;
    }
  }

  onArrowTap() {
    this.nextPet();
  }

  onQuickItemTap(item: string, route: string) {
    this.activeQuickItem = item;
    setTimeout(() => {
      this.activeQuickItem = null;
      this.router.navigate([route]);
    }, 300);
  }

  onAddPet() {
    this.activeQuickItem = 'add';
    setTimeout(() => {
      this.activeQuickItem = null;
      this.router.navigate(['/add-pet']);
    }, 300);
  }

  onPetCardTap() {
    if (this.currentPet?.id) {
      this.router.navigate(['/pet-profile', this.currentPet.id]);
    }
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
    if (s === 'macho' || s === 'male') return '#4A90E2'; // azul
    if (s === 'hembra' || s === 'female') return '#FF8FB1'; // rosa
    return '#CCCCCC'; // neutro si no hay dato
  }

  navigate(route: string) { this.router.navigate([route]); }

  // ---- Menú del header ----
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }
  menuGo(route: string) { this.menuOpen = false; this.navigate(route); }
  menuTutorial() { this.menuOpen = false; this.openTutorialMenu(); }
  onAdsTap() { this.menuOpen = false; this.showToast('Quitar anuncios estará disponible pronto.'); }
  onAsociationVet() { this.router.navigate(['/vet']); }
  onFindVet() { this.router.navigate(['/maps']); }
  goToProfile() { this.router.navigate(['/profile']); }
}