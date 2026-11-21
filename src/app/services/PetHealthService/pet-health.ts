import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Pet, PetService } from 'src/app/services/PetService/pet';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';
import { PetRole } from 'src/app/models/shared-profile.model';
import {
  Allergy,
  AllergyOverview,
  AllergyState,
  AllergyStatus,
  DewormingEntry,
  DewormingOverview,
  HealthSummary,
  Neutered,
  NeuteredStatus,
  NewAllergy,
  NewDeworming,
} from 'src/app/models/pet-health.model';
import {
  normalizeAllergies,
  normalizeAllergy,
  normalizeDewormingEntry,
  normalizeDewormings,
  normalizeNeutered,
  normalizeSummary,
  parseHealthError,
} from 'src/app/shared/utils/pet-health.util';

/**
 * Salud de la mascota que registra el dueño (servicio Medical): desparasitación, alergias y esterilización.
 * Token normal: el usuario sale del token, nunca del body. Todos los errores salen como `HealthError`.
 *
 * Rutas (carpeta D9 de la colección Medical): `/allergies`, `/dewormings`, `/pets/{id}/clinical-profile`
 * y `/pets/{id}/clinical-summary`. Los cambios se hacen con `/corrections` y un motivo obligatorio.
 */
@Injectable({
  providedIn: 'root'
})
export class PetHealthService {
  /** Medical directo si está configurado en `environment.medicalUrl`; si no, el gateway. */
  private readonly baseUrl = environment.medicalUrl ? `${environment.medicalUrl.replace(/\/+$/, '')}/api` : environment.apiUrl;

  constructor(
    private http: HttpClient,
    private petService: PetService,
    private sharedProfiles: SharedProfileService
  ) {}

  // ---------- Acceso ----------

  /** La mascota y qué puede hacer el usuario con ella: OWNER y EDITOR registran; VIEWER solo lee. */
  loadAccess(petId: string): Observable<{ pet: Pet; role: PetRole; canEdit: boolean }> {
    const myId = localStorage.getItem('userId') || '';
    return this.petService.getPetById(petId).pipe(
      switchMap(pet =>
        (pet.ownerId && pet.ownerId === myId ? of<PetRole>('OWNER') : this.sharedProfiles.getMyRoleForPet(pet.id)).pipe(
          map(role => ({ pet, role, canEdit: role !== 'VIEWER' }))
        )
      )
    );
  }

  // ---------- Resumen del perfil ----------

  /** Esterilización, alergias y prevención en una sola consulta (para el perfil de la mascota). */
  getSummary(petId: string): Observable<HealthSummary> {
    return this.http.get<unknown>(`${this.baseUrl}/pets/${petId}/clinical-summary`).pipe(map(r => normalizeSummary(r)), this.mapError());
  }

  // ---------- Desparasitación ----------

  getDewormings(petId: string): Observable<DewormingOverview> {
    const params = new HttpParams().set('petId', petId);
    return this.http.get<unknown>(`${this.baseUrl}/dewormings`, { params }).pipe(map(r => normalizeDewormings(r)), this.mapError());
  }

  addDeworming(body: NewDeworming): Observable<DewormingEntry> {
    return this.http.post<any>(`${this.baseUrl}/dewormings`, body).pipe(
      map(r => normalizeDewormingEntry((r && typeof r === 'object' ? r.data ?? r : {}) as Record<string, any>, body.kind)),
      this.mapError()
    );
  }

  /** Anula una dosis registrada por error. No se borra: queda como "ingresada por error", con motivo. */
  voidDeworming(id: string, reason: string): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.baseUrl}/dewormings/${id}/corrections`, { reason, status: 'ENTERED_IN_ERROR' })
      .pipe(this.mapError());
  }

  // ---------- Alergias ----------

  getAllergies(petId: string): Observable<AllergyOverview> {
    const params = new HttpParams().set('petId', petId);
    return this.http.get<unknown>(`${this.baseUrl}/allergies`, { params }).pipe(map(r => normalizeAllergies(r)), this.mapError());
  }

  /** El dueño la declara: queda `SUSPECTED` hasta que un veterinario la confirme. */
  addAllergy(body: NewAllergy): Observable<Allergy> {
    return this.http.post<any>(`${this.baseUrl}/allergies`, body).pipe(
      map(r => normalizeAllergy((r && typeof r === 'object' ? r.data ?? r : {}) as Record<string, any>)),
      this.mapError()
    );
  }

  /** Cambia el estado de una alergia (`RESOLVED` o `ENTERED_IN_ERROR`) con motivo. Confirmar es solo del veterinario. */
  changeAllergyState(id: string, state: Extract<AllergyState, 'RESOLVED' | 'ENTERED_IN_ERROR'>, reason: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/allergies/${id}/corrections`, { reason, status: state }).pipe(this.mapError());
  }

  /** "Sin alergias conocidas" o volver a "Sin preguntar". 409 `ACTIVE_ALLERGIES_EXIST` si todavía tiene alergias vigentes. */
  setAllergyStatus(petId: string, allergyStatus: Extract<AllergyStatus, 'NONE_KNOWN' | 'UNKNOWN'>): Observable<unknown> {
    return this.http.put<unknown>(`${this.baseUrl}/pets/${petId}/clinical-profile`, { allergyStatus }).pipe(this.mapError());
  }

  // ---------- Esterilización ----------

  /** `neuteredAt` solo se envía con `YES` (no puede ser futura ni anterior al nacimiento). */
  setNeutered(petId: string, status: NeuteredStatus, at?: string): Observable<Neutered> {
    const body: { neuteredStatus: NeuteredStatus; neuteredAt?: string } = { neuteredStatus: status };
    if (status === 'YES' && at) body.neuteredAt = at;
    return this.http.put<any>(`${this.baseUrl}/pets/${petId}/clinical-profile`, body).pipe(
      map(r => normalizeNeutered(r && typeof r === 'object' ? (r.data ?? r).neutered ?? r.neutered : undefined)),
      this.mapError()
    );
  }

  private mapError<T>() {
    return catchError<T, Observable<never>>(err => throwError(() => parseHealthError(err)));
  }
}
