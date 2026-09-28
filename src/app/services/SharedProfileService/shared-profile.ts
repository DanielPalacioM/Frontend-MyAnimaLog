import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AccessRole, PetAccess, PetRole, SharedPet, PetInvitation } from 'src/app/models/shared-profile.model';
import { PetService } from 'src/app/services/PetService/pet';

@Injectable({
  providedIn: 'root'
})
export class SharedProfileService {
  private baseUrl = `${environment.apiUrl}/pets`;

  constructor(private http: HttpClient, private petService: PetService) {}

  private getOwnerId(): string {
    return localStorage.getItem('userId') || '';
  }

  // ================================
  // ACCESO (roles sobre una mascota)
  // ================================

  // POST /pets/{petId}/access
  grantAccess(petId: string, targetUserId: string, accessRole: AccessRole): Observable<any> {
    const ownerId = this.getOwnerId();
    return this.http.post(`${this.baseUrl}/${petId}/access`, {
      ownerId,
      targetUserId,
      accessRole
    });
  }

  // GET /pets/{petId}/access/{userId}
  getAccess(petId: string, userId: string): Observable<PetAccess> {
    return this.http.get<PetAccess>(`${this.baseUrl}/${petId}/access/${userId}`);
  }

  // PATCH /pets/{petId}/access/{userId}
  updateAccessRole(petId: string, userId: string, newRole: AccessRole): Observable<any> {
    const ownerId = this.getOwnerId();
    return this.http.patch(`${this.baseUrl}/${petId}/access/${userId}`, {
      ownerId,
      newRole
    });
  }

  // DELETE /pets/{petId}/access/{userId}?ownerId=...
  revokeAccess(petId: string, userId: string): Observable<any> {
    const ownerId = this.getOwnerId();
    return this.http.delete(`${this.baseUrl}/${petId}/access/${userId}`, {
      params: { ownerId }
    });
  }

  // GET /pets/{petId}/shared?ownerId=...  -> personas con acceso a esta mascota
  getPeopleWithAccessToPet(petId: string): Observable<PetAccess[]> {
    const ownerId = this.getOwnerId();
    return this.http.get<any>(`${this.baseUrl}/${petId}/shared`, {
      params: { ownerId }
    }).pipe(
      map(res => this.asList(res).map(a => ({
        userId: a.userId ?? a.user_id ?? a.targetUserId,
        userName: a.userName ?? a.username ?? a.user_name,
        userAvatarUrl: a.userAvatarUrl ?? a.profileImageUrl ?? a.avatarUrl,
        accessRole: a.accessRole ?? a.access_role ?? a.role
      })))
    );
  }

  // GET /pets/shared?userId=...  -> mascotas compartidas CONMIGO (a mi cuidado)
  // Este endpoint solo devuelve el acceso (petId + rol), sin los datos de la
  // mascota. Por eso se completa cada una con GET /pets/{id}, igual que hace
  // Pet Profile.
  getPetsInMyCare(): Observable<SharedPet[]> {
    return this.getSharedAccessList().pipe(
      switchMap(list => {
        if (list.length === 0) return of([] as SharedPet[]);
        return forkJoin(list.map(shared =>
          this.petService.getPetById(shared.id).pipe(
            map(pet => this.mergeSharedPet(shared, pet)),
            catchError(err => {
              console.error(`❌ Error cargando mascota compartida ${shared.id}:`, err);
              return of(shared);
            })
          )
        ));
      })
    );
  }

  private getSharedAccessList(): Observable<SharedPet[]> {
    const userId = this.getOwnerId();
    return this.http.get<any>(`${this.baseUrl}/shared`, {
      params: { userId }
    }).pipe(
      map(res => this.asList(res).map(p => this.normalizeSharedPet(p)))
    );
  }

  // Lo que venga del acceso se respeta; lo que falte sale de la mascota.
  private mergeSharedPet(shared: SharedPet, pet: any): SharedPet {
    return {
      ...shared,
      name: shared.name ?? pet.name,
      species: shared.species ?? pet.species,
      breed: shared.breed ?? pet.breed,
      sex: shared.sex ?? pet.sex,
      birthDate: shared.birthDate ?? pet.birthDate,
      ageMonths: shared.ageMonths ?? pet.ageMonths ?? null,
      weight: shared.weight ?? pet.weight ?? pet.weightKg ?? null,
      height: shared.height ?? pet.height ?? pet.heightCm ?? null,
      imageUrl: shared.imageUrl ?? pet.imageUrl ?? null,
      ownerId: shared.ownerId ?? pet.ownerId
    };
  }

  // Rol del usuario logueado sobre la mascota. Si aparece en "a mi cuidado"
  // se usa ese rol; si no, es una de sus propias mascotas (OWNER).
  // Solo necesita el rol, así que no pide los datos de cada mascota.
  getMyRoleForPet(petId: string): Observable<PetRole> {
    return this.getSharedAccessList().pipe(
      map(list => list.find(p => p.id === petId)?.accessRole ?? 'OWNER'),
      catchError(() => of<PetRole>('OWNER'))
    );
  }

  // Algunas respuestas llegan como arreglo y otras envueltas en un objeto.
  private asList(res: any): any[] {
    if (Array.isArray(res)) return res;
    return res?.data || res?.pets || res?.content || res?.invitations || res?.access || [];
  }

  // La respuesta puede traer la mascota "plana" o anidada en { pet: {...} }.
  private normalizeSharedPet(raw: any): SharedPet {
    const p = raw?.pet ? { ...raw.pet, ...raw } : raw;
    return {
      id: p.petId ?? p.pet_id ?? p.id,
      name: p.name ?? p.petName,
      species: p.species,
      breed: p.breed,
      sex: p.sex,
      birthDate: p.birthDate ?? p.birth_date,
      ageMonths: p.ageMonths ?? p.age_months ?? null,
      weight: p.weight ?? p.weightKg ?? null,
      height: p.height ?? p.heightCm ?? null,
      imageUrl: p.photoUrl ?? p.imageUrl ?? p.photo_url ?? null,
      ownerId: p.ownerId ?? p.owner_id,
      ownerName: p.ownerName ?? p.owner_name,
      ownerAvatarUrl: p.ownerAvatarUrl ?? p.ownerPhotoUrl ?? p.owner_avatar_url,
      accessRole: p.accessRole ?? p.access_role ?? p.role ?? 'VIEWER'
    };
  }

  // ================================
  // INVITACIONES
  // ================================

  // POST /pets/{petId}/invitations
  sendInvitation(petId: string, email: string, accessRole: AccessRole): Observable<PetInvitation> {
    const ownerId = this.getOwnerId();
    return this.http.post<PetInvitation>(`${this.baseUrl}/${petId}/invitations`, {
      ownerId,
      email,
      accessRole
    });
  }

  // POST /pets/{petId}/invitations/resend
  resendInvitation(petId: string, email: string, accessRole: AccessRole): Observable<any> {
    const ownerId = this.getOwnerId();
    return this.http.post(`${this.baseUrl}/${petId}/invitations/resend`, {
      ownerId,
      email,
      accessRole
    });
  }

  // GET /pets/{petId}/invitations/check?email=...
  checkInvitation(petId: string, email: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${petId}/invitations/check`, {
      params: { email }
    });
  }

  // GET /pets/{petId}/invitations/pending?ownerId=...
  getPendingInvitationsForPet(petId: string): Observable<PetInvitation[]> {
    const ownerId = this.getOwnerId();
    return this.http.get<PetInvitation[]>(`${this.baseUrl}/${petId}/invitations/pending`, {
      params: { ownerId }
    });
  }

  // GET /pets/invitations/pending  -> invitaciones pendientes PARA MÍ (para notificaciones)
  // Sin email: el backend lo saca del JWT. El backend no genera una
  // notificación para el invitado, así que la vista de Notificaciones las
  // pide por aquí. Se normaliza porque la respuesta puede venir en
  // snake_case (pet_id, access_role, ...).
  getMyPendingInvitations(): Observable<PetInvitation[]> {
    return this.http.get<any>(`${this.baseUrl}/invitations/pending`).pipe(
      map(res => {
        return this.asList(res)
          .map(i => this.normalizeInvitation(i))
          .filter(i => i.status === 'PENDING');
      })
    );
  }

  private normalizeInvitation(i: any): PetInvitation {
    return {
      id: i.id,
      token: i.token ?? i.invitationToken ?? i.invitation_token,
      petId: i.petId ?? i.pet_id,
      petName: i.petName ?? i.pet_name,
      petImageUrl: i.petPhotoUrl ?? i.petImageUrl ?? i.pet_photo_url ?? null,
      ownerId: i.ownerId ?? i.owner_id ?? i.invitedBy ?? i.inviterId,
      ownerName: i.ownerName ?? i.owner_name ?? i.inviterName,
      ownerAvatarUrl: i.ownerAvatarUrl ?? i.ownerPhotoUrl ?? i.inviterAvatarUrl ?? null,
      email: i.email,
      accessRole: i.accessRole ?? i.access_role,
      status: i.status ?? 'PENDING',
      createdAt: i.createdAt ?? i.created_at,
      expiresAt: i.expiresAt ?? i.expires_at
    };
  }

  // Accept / reject / expired usan el TOKEN de la invitación (campo "token"
  // de PetInvitation), no su id.

  // GET /pets/invitations/{token}/expired  -> ¿la invitación ya expiró?
  isInvitationExpired(invitationToken: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/invitations/${invitationToken}/expired`);
  }

  // POST /pets/invitations/{token}/accept  { userId }  (sin body -> 400)
  acceptInvitation(invitationToken: string): Observable<any> {
    const userId = this.getOwnerId();
    return this.http.post(`${this.baseUrl}/invitations/${invitationToken}/accept`, { userId });
  }

  // POST /pets/invitations/{token}/reject  (sin body)
  rejectInvitation(invitationToken: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invitations/${invitationToken}/reject`, null);
  }
}