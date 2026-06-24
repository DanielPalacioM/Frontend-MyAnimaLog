import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shared-profiles-home',
  templateUrl: './shared-profiles-home.page.html',
  styleUrls: ['./shared-profiles-home.page.scss'],
  standalone: false
})
export class SharedProfilesHomePage implements OnInit {

  username: string = 'Luisa Fernandez';
  userAvatar: string = 'assets/images/default-avatar.png';
  activeTab: string = 'mis-mascotas';

  totalMascotas: number = 4;
  totalPersonas: number = 10;
  totalAMiCuidado: number = 1;

  myPets: any[] = [];
  sharedPersons: any[] = [];
  petsInCare: any[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // TODO: conectar con backend
    this.myPets = [
      {
        id: '1',
        name: 'Milo',
        breed: 'Pastor alemán - Macho - 60cm',
        age: 11,
        vaccines: 5,
        vetVisits: 15,
        weight: 40,
        imageUrl: 'assets/images/pet-placeholder.png',
        caregivers: [
          { name: 'Maria', avatarUrl: 'assets/images/default-avatar.png' },
          { name: 'Luis', avatarUrl: 'assets/images/default-avatar.png' }
        ]
      }
    ];

    this.sharedPersons = [
      {
        id: '1',
        name: 'Luis',
        role: 'Editor',
        avatarUrl: 'assets/images/default-avatar.png',
        pets: [{ imageUrl: 'assets/images/pet-placeholder.png' }]
      },
      {
        id: '2',
        name: 'Maria',
        role: 'Editor',
        avatarUrl: 'assets/images/default-avatar.png',
        pets: [{ imageUrl: 'assets/images/pet-placeholder.png' }]
      }
    ];

    this.petsInCare = [
      {
        id: '1',
        name: 'Milo',
        breed: 'Pastor alemán - Macho - 60cm',
        age: 11,
        vaccines: 5,
        vetVisits: 15,
        weight: 40,
        imageUrl: 'assets/images/pet-placeholder.png',
        owner: {
          name: 'Luis',
          role: 'Dueño',
          avatarUrl: 'assets/images/default-avatar.png'
        }
      }
    ];
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onSharePet() {
    // TODO: abrir modal de compartir
  }

  onViewPet(id: string) {
    this.router.navigate(['/pet-profile', id]);
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}