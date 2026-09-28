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
  showTutorial: boolean = false;
  isFirstTime: boolean = false;
  activeQuickItem: string | null = null;
  tutorialStep: number = 0;

  tutorialSteps = [
    { key: 'vet',           text: 'Consulta veterinarias cercanas' },
    { key: 'shared',        text: 'Comparte el cuidado de tu mascota' },
    { key: 'add',           text: '¡Agrega tu primera mascota aquí!' },
    { key: 'calendar-quick',text: 'Agenda citas y eventos' },
    { key: 'maps',          text: 'Encuentra lugares pet-friendly' },
    { key: 'calendar-card', text: 'Desde aquí creas y ves tus eventos' },
    { key: 'vet-card',      text: 'Asocia o busca una veterinaria' },
  ];

  get totalSteps() { return this.tutorialSteps.length; }
  get currentTutorialStep() { return this.tutorialSteps[this.tutorialStep]; }

  pets: Pet[] = [];
  upcomingEvents: CalendarEvent[] = [];
  unreadNotificationsCount: number = 0;

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
    private sharedProfileService: SharedProfileService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadPets();
    this.loadEvents();
    this.checkFirstTime();

    // El contador se mantiene al día solo: si desde Notificaciones (u otra
    // pantalla) se marca algo como leído, este valor baja de inmediato sin
    // que Home tenga que volver a pedirlo.
    this.unreadCountSub = this.notificationService.unreadCount$.subscribe(
      count => this.unreadNotificationsCount = count
    );
    this.notificationService.refreshUnreadCount();
  }

   ionViewWillEnter() {
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

  checkFirstTime() {
    const visited = localStorage.getItem('hasVisited');
    if (!visited && !this.hasPets) {
      this.isFirstTime = true;
      this.showTutorial = true;
      localStorage.setItem('hasVisited', 'true');
    }
  }

  loadUserData() {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.username = profile.username;
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
        this.showTutorial = !this.hasPets;
        this.checkFirstTime();
        if (this.currentPetIndex >= this.pets.length) {
          this.currentPetIndex = 0;
        }
      },
      error: (err) => {
        console.error('❌ Error cargando mascotas:', err);
        this.pets = [];
        this.hasPets = false;
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

  nextTutorialStep() {
    if (this.tutorialStep < this.totalSteps - 1) {
      this.tutorialStep++;
    } else {
      this.closeTutorial();
    }
  }

  closeTutorial() {
    this.isFirstTime = false;
    this.tutorialStep = 0;
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
  console.log('drag %', this.currentTranslateX);
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
  onAsociationVet() { this.router.navigate(['/vet']); }
  onFindVet() { this.router.navigate(['/vet/find']); }
  goToProfile() { this.router.navigate(['/profile']); }
}