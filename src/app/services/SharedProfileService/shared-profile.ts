import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AccessRole, PetAccess, SharedPet, PetInvitation } from 'src/app/models/shared-profile.model';

@Injectable({
  providedIn: 'root'
})
export class SharedProfileService {
  private baseUrl = `${environment.apiUrl}/pets`;
  private invitationsUrl = `${environment.apiUrl}/invitations`;

  constructor(private http: HttpClient) {}

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

  // GET /pets/invitations/pending  -> invitaciones pendientes PARA MÍ (para notificaciones)
  getMyPendingInvitations(): Observable<PetInvitation[]> {
    return this.http.get<PetInvitation[]>(`${this.baseUrl}/invitations/pending`);
  }

  // POST /pets/invitations/{id}/expired  -> marcar invitación como expirada
  expireInvitation(invitationId: string, email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/invitations/${invitationId}/expired`, { email });
  }

  // POST /invitations/{id}/accept
  acceptInvitation(invitationId: string): Observable<any> {
    const userId = this.getOwnerId();
    return this.http.post(`${this.invitationsUrl}/${invitationId}/accept`, { userId });
  }

  // POST /invitations/{id}/reject
  rejectInvitation(invitationId: string): Observable<any> {
    return this.http.post(`${this.invitationsUrl}/${invitationId}/reject`, {});
  }
}