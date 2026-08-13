import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import { PetService, Pet,  } from 'src/app/services/PetService/pet';
import { PetAccess, SharedPet } from 'src/app/models/shared-profile.model';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';


interface PersonaCompartida {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  pets: { imageUrl: string | null }[];
}

@Component({
  selector: 'app-shared-profiles-home',
  templateUrl: './shared-profiles-home.page.html',
  styleUrls: ['./shared-profiles-home.page.scss'],
  standalone: false
})
export class SharedProfilesHomePage implements OnInit {

  username: string = '';
  userAvatar: string = 'assets/images/default-avatar.png';
  activeTab: string = 'mis-mascotas';

  myPets: Pet[] = [];
  petsInCare: SharedPet[] = [];
  sharedPersons: PersonaCompartida[] = [];

  showInviteModal = false;
  inviteEmail = '';
  inviteRole: 'EDITOR' | 'VIEWER' = 'VIEWER';
  inviteSelectedPetId: string | null = null;
  sendingInvite = false;
  petCaregivers: { [petId: string]: PersonaCompartida[] } = {};

  

  loading = true;

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private petService: PetService,
    private sharedProfileService: SharedProfileService
  ) {}

  ngOnInit() {
    this.loadData();
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
  if (s === 'macho' || s === 'male') return '#4A90E2';
  if (s === 'hembra' || s === 'female') return '#FF8FB1';
  return '#CCCCCC';
}

get showEmptyMyPets(): boolean {
  return !this.loading && this.myPets.length === 0;
}

get showEmptyPersonas(): boolean {
  return !this.loading && this.sharedPersons.length === 0;
}

get showEmptyPetsInCare(): boolean {
  return !this.loading && this.petsInCare.length === 0;
}

  ionViewWillEnter() {
    this.loadData();
  }

  get totalMascotas(): number {
    return this.myPets.length;
  }

  get totalPersonas(): number {
    return this.sharedPersons.length;
  }

  get totalAMiCuidado(): number {
    return this.petsInCare.length;
  }

  loadData() {
    this.loading = true;

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.username = profile.username || '';
        if (profile.profileImageUrl) {
          this.userAvatar = profile.profileImageUrl;
        }
      },
      error: (err) => console.error('❌ Error cargando perfil:', err)
    });

    this.petService.getPets().subscribe({
      next: (pets) => {
        this.myPets = pets;
        this.loadSharedPersons(pets);
      },
      error: (err) => {
        console.error('❌ Error cargando mis mascotas:', err);
        this.myPets = [];
      }
    });

    this.sharedProfileService.getPetsInMyCare().subscribe({
      next: (pets) => {
        this.petsInCare = pets;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando mascotas a mi cuidado:', err);
        this.petsInCare = [];
        this.loading = false;
      }
    });
  }

  private loadSharedPersons(pets: Pet[]) {
  if (pets.length === 0) {
    this.sharedPersons = [];
    this.petCaregivers = {};
    return;
  }

  const personMap = new Map<string, PersonaCompartida>();
  this.petCaregivers = {};

  let completed = 0;
  pets.forEach((pet) => {
    this.sharedProfileService.getPeopleWithAccessToPet(pet.id).subscribe({
      next: (accessList: PetAccess[]) => {
        const caregiversForThisPet: PersonaCompartida[] = [];

        accessList.forEach((access) => {
          const persona: PersonaCompartida = {
            id: access.userId,
            name: access.userName || 'Usuario',
            role: access.accessRole === 'EDITOR' ? 'Editor' : 'Solo vista',
            avatarUrl: access.userAvatarUrl || 'assets/images/default-avatar.png',
            pets: []
          };

          caregiversForThisPet.push(persona);

          if (!personMap.has(access.userId)) {
            personMap.set(access.userId, { ...persona, pets: [] });
          }
          personMap.get(access.userId)!.pets.push({ imageUrl: pet.imageUrl });
        });

        this.petCaregivers[pet.id] = caregiversForThisPet;

        completed++;
        if (completed === pets.length) {
          this.sharedPersons = Array.from(personMap.values());
        }
      },
      error: (err) => {
        console.error(`❌ Error cargando acceso de mascota ${pet.id}:`, err);
        this.petCaregivers[pet.id] = [];
        completed++;
        if (completed === pets.length) {
          this.sharedPersons = Array.from(personMap.values());
        }
      }
    });
  });
}

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onSharePet() {
  this.inviteEmail = '';
  this.inviteRole = 'VIEWER';
  this.inviteSelectedPetId = this.myPets.length > 0 ? this.myPets[0].id : null;
  this.showInviteModal = true;
}

closeInviteModal() {
  this.showInviteModal = false;
}

toggleInviteRole() {
  this.inviteRole = this.inviteRole === 'EDITOR' ? 'VIEWER' : 'EDITOR';
}

sendInvite() {
  if (!this.inviteSelectedPetId || !this.inviteEmail.trim()) return;
  this.sendingInvite = true;
  this.sharedProfileService.sendInvitation(this.inviteSelectedPetId, this.inviteEmail.trim(), this.inviteRole)
    .subscribe({
      next: () => {
        this.sendingInvite = false;
        this.showInviteModal = false;
        alert('Invitación enviada correctamente');
      },
      error: (err) => {
        this.sendingInvite = false;
        console.error('❌ Error enviando invitación:', err);
        alert('No se pudo enviar la invitación.');
      }
    });
}

  onViewPet(id: string) {
    this.router.navigate(['/pet-profile', id]);
  }

  goBack() {
    history.back();
  }
}