import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from 'src/environments/environment';
import { AccessRole, PetAccess, SharedPet, PetInvitation } from 'src/app/models/shared-profile.model';

@Injectable({
  providedIn: 'root'
})
export class SharedProfileService {
  private baseUrl = `${environment.apiUrl}/pets`;

  constructor(private http: HttpClient) {}

  private getOwnerId(): string {
    return localStorage.getItem('userId') || '';
  }

  // El email del usuario logueado sale del JWT (no se guarda en localStorage).
  private getMyEmail(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const decoded: any = jwtDecode(token);
      const candidates = [decoded.email, decoded.sub, decoded.username];
      return candidates.find(c => typeof c === 'string' && c.includes('@')) || '';
    } catch {
      return '';
    }
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
    return this.http.get<PetAccess[]>(`${this.baseUrl}/${petId}/shared`, {
      params: { ownerId }
    });
  }

  // GET /pets/shared?userId=...  -> mascotas compartidas CONMIGO (a mi cuidado)
  getPetsInMyCare(): Observable<SharedPet[]> {
    const userId = this.getOwnerId();
    return this.http.get<SharedPet[]>(`${this.baseUrl}/shared`, {
      params: { userId }
    });
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

  // GET /pets/invitations/pending?email=...  -> invitaciones pendientes PARA MÍ (para notificaciones)
  // OJO: en Postman este endpoint recibe el email en el BODY de un GET, y el
  // navegador no puede mandar body en un GET. Se manda como query param, así
  // que el backend tiene que aceptar @RequestParam email.
  // El backend guarda la invitación solo con el email (user_id = null) y NO
  // genera una notificación para el invitado, así que la vista de
  // Notificaciones tiene que pedirlas por aquí. Se normaliza porque la
  // respuesta puede venir en snake_case (pet_id, access_role, ...).
  getMyPendingInvitations(): Observable<PetInvitation[]> {
    const email = this.getMyEmail();
    return this.http.get<any>(`${this.baseUrl}/invitations/pending`, {
      params: email ? { email } : {}
    }).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : (res?.invitations || res?.data || []);
        return list
          .map(i => this.normalizeInvitation(i))
          .filter(i => i.status === 'PENDING');
      })
    );
  }

  private normalizeInvitation(i: any): PetInvitation {
    return {
      id: i.id,
      petId: i.petId ?? i.pet_id,
      petName: i.petName ?? i.pet_name,
      email: i.email,
      accessRole: i.accessRole ?? i.access_role,
      status: i.status ?? 'PENDING',
      createdAt: i.createdAt ?? i.created_at,
      expiresAt: i.expiresAt ?? i.expires_at
    };
  }

  // GET /pets/invitations/{id}/expired  -> ¿la invitación ya expiró?
  isInvitationExpired(invitationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/invitations/${invitationId}/expired`);
  }

  // POST /pets/invitations/{id}/accept
  acceptInvitation(invitationId: string): Observable<any> {
    const userId = this.getOwnerId();
    return this.http.post(`${this.baseUrl}/invitations/${invitationId}/accept`, { userId });
  }

  // POST /pets/invitations/{id}/reject
  rejectInvitation(invitationId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invitations/${invitationId}/reject`, {});
  }
}