import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService, UserSummary } from 'src/app/services/ProfileService/profile';
import { PetService, Pet,  } from 'src/app/services/PetService/pet';
import { PetAccess, SharedPet } from 'src/app/models/shared-profile.model';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';
import { VaccineService } from 'src/app/services/VaccineService/vaccine/vaccine';
import { MedicalHistoryService } from 'src/app/services/MedicalHistoryService/medical-history';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';


interface PersonaCompartida {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  pets: { imageUrl: string | null; name: string; species: string }[];
}

@Component({
  selector: 'app-shared-profiles-home',
  templateUrl: './shared-profiles-home.page.html',
  styleUrls: ['./shared-profiles-home.page.scss'],
  standalone: false
})
export class SharedProfilesHomePage implements OnInit {

  username: string = '';
  userAvatar: string = 'assets/images/default-avatar.svg';
  activeTab: string = 'mis-mascotas';

  myPets: Pet[] = [];
  petsInCare: SharedPet[] = [];
  sharedPersons: PersonaCompartida[] = [];

  showInviteModal = false;
  inviteEmail = '';
  inviteRole: 'EDITOR' | 'VIEWER' = 'VIEWER';
  inviteSelectedPetId: string | null = null;
  sendingInvite = false;
  // Búsqueda del correo invitado: solo se puede invitar a una cuenta existente.
  searchingInvitee = false;
  invitee: UserSummary | null = null;
  inviteeError = '';
  petCaregivers: { [petId: string]: PersonaCompartida[] } = {};
  petCounts: { [petId: string]: { vaccines?: number | null; visits?: number | null } } = {};

  loading = true;

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private petService: PetService,
    private sharedProfileService: SharedProfileService,
    private vaccineService: VaccineService,
    private medicalHistoryService: MedicalHistoryService
  ) {}

  ngOnInit() {
    this.loadData();
  }
  

  formatAge(ageMonths: number | null | undefined, birthDate: string | undefined): string {
  if (ageMonths !== null && ageMonths !== undefined) {
    if (ageMonths < 12) return `${ageMonths} meses`;
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    return months > 0 ? `${years} años ${months} meses` : `${years} años`;
  }
  if (birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`;
  }
  return '—';
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

sexLabel(sex: string | undefined): string {
  const s = (sex || '').toLowerCase().trim();
  if (s === 'macho' || s === 'male') return 'Macho';
  if (s === 'hembra' || s === 'female') return 'Hembra';
  return sex || '';
}

// "Pastor alemán - Macho - 60 cm"
petDetails(pet: { breed?: string; sex?: string; height?: number | null }): string {
  return [pet.breed, this.sexLabel(pet.sex), pet.height ? `${pet.height} cm` : '']
    .filter(Boolean)
    .join(' - ');
}

private readonly pillColors = ['#FF6F7B', '#FF7A3D', '#FFB84F', '#5FA3DC'];

pillColor(index: number): string {
  return this.pillColors[index % this.pillColors.length];
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
        this.loadCounts(pets.map(p => p.id));
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
        this.loadOwners(pets);
        this.loadCounts(pets.map(p => p.id));
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

    forkJoin(pets.map(pet =>
      this.sharedProfileService.getPeopleWithAccessToPet(pet.id).pipe(
        catchError(err => {
          console.error(`❌ Error cargando acceso de mascota ${pet.id}:`, err);
          return of([] as PetAccess[]);
        }),
        map(accessList => ({ pet, accessList }))
      )
    )).subscribe(results => {
      const personMap = new Map<string, PersonaCompartida>();
      const caregivers: { [petId: string]: PersonaCompartida[] } = {};

      results.forEach(({ pet, accessList }) => {
        caregivers[pet.id] = accessList.map(access => {
          if (!personMap.has(access.userId)) {
            personMap.set(access.userId, {
              id: access.userId,
              name: access.userName || 'Usuario',
              role: access.accessRole === 'EDITOR' ? 'Editor' : 'Solo vista',
              avatarUrl: access.userAvatarUrl || 'assets/images/default-avatar.svg',
              pets: []
            });
          }
          const persona = personMap.get(access.userId)!;
          persona.pets.push({ imageUrl: pet.imageUrl, name: pet.name, species: pet.species });
          return persona;
        });
      });

      this.petCaregivers = caregivers;
      this.sharedPersons = Array.from(personMap.values());

      // El acceso normalmente solo trae el userId: nombre y foto salen del
      // perfil de cada persona. Es el mismo objeto en "Mis mascotas" y en
      // "Personas compartidas", así que se actualiza en las dos a la vez.
      this.sharedPersons.forEach(persona => {
        this.profileService.getUserById(persona.id).subscribe(user => {
          if (!user) return;
          if (user.username) persona.name = user.username;
          if (user.avatarUrl) persona.avatarUrl = user.avatarUrl;
        });
      });
    });
  }

  // Vacunas y visitas al veterinario de cada mascota (para las cards).
  private loadCounts(petIds: string[]) {
    petIds.forEach(id => {
      this.vaccineService.getVaccinesByPet(id).pipe(catchError(() => of(null))).subscribe(list => {
        this.petCounts[id] = { ...this.petCounts[id], vaccines: list ? list.length : null };
      });
      this.medicalHistoryService.getVisitsByPet(id).pipe(catchError(() => of(null))).subscribe(list => {
        this.petCounts[id] = { ...this.petCounts[id], visits: list ? list.length : null };
      });
    });
  }

  countOf(petId: string, key: 'vaccines' | 'visits'): string {
    const value = this.petCounts[petId]?.[key];
    return value === null || value === undefined ? '—' : String(value);
  }

  // Nombre y foto del dueño de cada mascota a mi cuidado.
  private loadOwners(pets: SharedPet[]) {
    pets.forEach(pet => {
      if (!pet.ownerId || (pet.ownerName && pet.ownerAvatarUrl)) return;
      this.profileService.getUserById(pet.ownerId).subscribe(user => {
        if (!user) return;
        pet.ownerName = pet.ownerName || user.username;
        pet.ownerAvatarUrl = pet.ownerAvatarUrl || user.avatarUrl || undefined;
      });
    });
  }

  getRoleLabel(role: string | undefined): string {
    return role === 'EDITOR' ? 'Editor' : 'Solo vista';
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onSharePet() {
  this.inviteEmail = '';
  this.inviteRole = 'VIEWER';
  this.inviteSelectedPetId = this.myPets.length > 0 ? this.myPets[0].id : null;
  this.resetInvitee();
  this.showInviteModal = true;
}

closeInviteModal() {
  this.showInviteModal = false;
}

toggleInviteRole() {
  this.inviteRole = this.inviteRole === 'EDITOR' ? 'VIEWER' : 'EDITOR';
}

// Al cambiar el correo se descarta la persona encontrada antes.
onInviteEmailChange() {
  this.resetInvitee();
}

private resetInvitee() {
  this.invitee = null;
  this.inviteeError = '';
  this.searchingInvitee = false;
}

// Busca el correo: si existe una cuenta activa se muestra su foto y nombre
// para confirmar antes de enviar la invitación.
searchInvitee() {
  const email = this.inviteEmail.trim();
  this.resetInvitee();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    this.inviteeError = 'Ingresa un correo electrónico válido.';
    return;
  }
  this.searchingInvitee = true;
  this.profileService.findUserByEmail(email).subscribe(user => {
    this.searchingInvitee = false;
    if (!user) {
      this.inviteeError = 'No encontramos una cuenta activa con ese correo.';
    } else if (user.id === localStorage.getItem('userId')) {
      this.inviteeError = 'No puedes invitarte a ti mismo.';
    } else {
      this.invitee = user;
    }
  });
}

sendInvite() {
  if (!this.inviteSelectedPetId || !this.invitee) return;
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