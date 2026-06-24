import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { pet } from 'src/app/shared/components/pet-card/pet-card.component';
import { CalendarEvent } from '../../shared/components/calendar-widget/calendar-widget.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  username: string = 'Username';
  userAvatar: string = 'assets/images/default-avatar.png';
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

  pets: pet[] = [];
  upcomingEvents: CalendarEvent[] = [];

  constructor(public router: Router) {}

  ngOnInit() {
    this.loadUserData();
    this.loadPets();
    this.loadEvents();
    this.checkFirstTime();
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
    this.username = 'Username';
  }

  loadPets() {
    this.pets = [];
    this.hasPets = this.pets.length > 0;
    this.showTutorial = !this.hasPets;
  }

  loadEvents() {
    this.upcomingEvents = [];
  }

  get currentPet(): pet {
    return this.pets[this.currentPetIndex];
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

  onSwipeLeft() {
    if (this.currentPetIndex < this.pets.length - 1) {
      this.currentPetIndex++;
    }
  }

  onSwipeRight() {
    if (this.currentPetIndex > 0) {
      this.currentPetIndex--;
    }
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
      this.router.navigate(['/pets/add']);
    }, 300);
  }

  navigate(route: string) { this.router.navigate([route]); }
  onSeeAll() { this.router.navigate(['/pets']); }
  onAsociationVet() { this.router.navigate(['/vet']); }
  onFindVet() { this.router.navigate(['/vet/find']); }
  goToProfile() { this.router.navigate(['/profile']); }
}