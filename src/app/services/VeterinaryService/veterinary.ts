import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  LinkedVet,
  PetVet,
  RevokePetResponse,
  SharePetsResponse,
  UnlinkResponse,
  VetLinkResult,
  VetPreview,
} from 'src/app/models/veterinary.model';
import { normalizeVetCode, parseVetError } from 'src/app/shared/utils/vet.util';

/** Mascota mínima que necesita el cruce "qué clínica ve a quién". */
export interface PetRef { id: string; name: string; /** Desde cuándo la ve la clínica (solo en el mapa de `loadSharing`). */ grantedAt?: string; }

/**
 * Parte Vet del dueño (veterinary-service, Fase 4A, carpeta 11 de Postman).
 * Token normal: el userId sale del token, nunca del body. Todos los errores salen como `VetError`.
 */
@Injectable({ providedIn: 'root' })
export class VeterinaryService {
  private readonly baseUrl = `${environment.apiUrl}/veterinary`;

  constructor(private http: HttpClient) {}

  /** Vista previa por código (el código va en el body, nunca en la URL). */
  previewByCode(code: string): Observable<VetPreview> {
    return this.http
      .post<any>(`${this.baseUrl}/links/preview`, { code: normalizeVetCode(code) })
      .pipe(map(r => this.toPreview(r)), this.mapError());
  }

  /** Vincularme. Idempotente: si ya estaba vinculado responde 200 con `alreadyLinked`. */
  link(code: string): Observable<VetLinkResult> {
    return this.http
      .post<any>(`${this.baseUrl}/links`, { code: normalizeVetCode(code) })
      .pipe(map(r => this.toLinkResult(r)), this.mapError());
  }

  getLinked(): Observable<LinkedVet[]> {
    return this.http.get<any>(`${this.baseUrl}/me/linked-veterinaries`).pipe(
      map(r => (Array.isArray(r) ? r : r?.veterinaries ?? []).map((v: any) => this.toLinkedVet(v))),
      this.mapError()
    );
  }

  /** Desvincularme: el backend revoca en el mismo paso todas las mascotas compartidas con esa clínica. */
  unlink(veterinaryId: string): Observable<UnlinkResponse> {
    return this.http.delete<any>(`${this.baseUrl}/me/linked-veterinaries/${veterinaryId}`).pipe(
      map(r => ({
        veterinaryId: r?.veterinaryId ?? veterinaryId,
        revokedPetsCount: r?.revokedPetsCount ?? r?.revoked_pets_count ?? 0,
      })),
      this.mapError()
    );
  }

  /** Todo o nada: si alguna mascota no es mía, no se comparte ninguna (403 PET_NOT_OWNED). */
  sharePets(veterinaryId: string, petIds: string[]): Observable<SharePetsResponse> {
    return this.http
      .post<any>(`${this.baseUrl}/me/linked-veterinaries/${veterinaryId}/pets`, { petIds })
      .pipe(map(r => this.toShareResponse(r, veterinaryId)), this.mapError());
  }

  revokePet(veterinaryId: string, petId: string): Observable<RevokePetResponse> {
    return this.http
      .delete<any>(`${this.baseUrl}/me/linked-veterinaries/${veterinaryId}/pets/${petId}`)
      .pipe(
        map(r => ({
          veterinaryId: r?.veterinaryId ?? veterinaryId,
          petId: r?.petId ?? petId,
          petName: r?.petName ?? r?.pet_name ?? '',
          revokedAt: r?.revokedAt ?? r?.revoked_at ?? '',
          alreadyRevoked: !!(r?.alreadyRevoked ?? r?.already_revoked),
        })),
        this.mapError()
      );
  }

  /** Clínicas que hoy ven esta mascota (solo el dueño: 403 PET_NOT_OWNED si no). */
  getVetsForPet(petId: string): Observable<PetVet[]> {
    return this.http.get<any>(`${this.baseUrl}/me/pets/${petId}/veterinaries`).pipe(
      map(r => (Array.isArray(r) ? r : r?.veterinaries ?? []).map((v: any) => this.toPetVet(v))),
      this.mapError()
    );
  }

  /**
   * Cruza mis mascotas con las clínicas que las ven → mapa `veterinaryId → mascotas`.
   * El backend no lista "qué mascotas ve la clínica X" desde el lado del dueño, solo lo contrario,
   * así que se pregunta por cada mascota. Si una consulta falla, esa mascota cuenta como no compartida.
   */
  loadSharing(pets: PetRef[]): Observable<Map<string, PetRef[]>> {
    if (!pets.length) return of(new Map());
    return forkJoin(
      pets.map(p =>
        this.getVetsForPet(p.id).pipe(
          catchError(err => {
            console.error('❌ No se pudo leer con qué clínicas se comparte', p.id, err);
            return of([] as PetVet[]);
          }),
          map(vets => ({ pet: p, vets }))
        )
      )
    ).pipe(
      map(rows => {
        const out = new Map<string, PetRef[]>();
        for (const { pet, vets } of rows) {
          for (const v of vets) {
            const list = out.get(v.veterinaryId) ?? [];
            list.push({ ...pet, grantedAt: v.grantedAt });
            out.set(v.veterinaryId, list);
          }
        }
        return out;
      })
    );
  }

  // ---------- normalización (el backend mezcla camelCase y snake_case) ----------

  private mapError<T>() {
    return catchError<T, Observable<never>>(err => throwError(() => parseVetError(err)));
  }

  private toPreview(r: any): VetPreview {
    return {
      veterinaryId: r?.veterinaryId ?? r?.veterinary_id ?? r?.id ?? '',
      name: r?.name ?? '',
      logoUrl: r?.logoUrl ?? r?.logo_url ?? null,
      city: r?.city ?? '',
      department: r?.department ?? '',
      address: r?.address ?? '',
      alreadyLinked: !!(r?.alreadyLinked ?? r?.already_linked),
    };
  }

  private toLinkResult(r: any): VetLinkResult {
    return {
      id: r?.id ?? '',
      veterinaryId: r?.veterinaryId ?? r?.veterinary_id ?? '',
      veterinaryName: r?.veterinaryName ?? r?.veterinary_name ?? '',
      logoUrl: r?.logoUrl ?? r?.logo_url ?? null,
      linkedAt: r?.linkedAt ?? r?.linked_at ?? '',
      alreadyLinked: !!(r?.alreadyLinked ?? r?.already_linked),
    };
  }

  private toLinkedVet(v: any): LinkedVet {
    return {
      veterinaryId: v?.veterinaryId ?? v?.veterinary_id ?? v?.id ?? '',
      name: v?.name ?? '',
      logoUrl: v?.logoUrl ?? v?.logo_url ?? null,
      city: v?.city ?? '',
      phone: v?.phone ?? '',
      status: v?.status ?? '',
      linkedAt: v?.linkedAt ?? v?.linked_at ?? '',
      sharedPetsCount: v?.sharedPetsCount ?? v?.shared_pets_count ?? 0,
    };
  }

  private toPetVet(v: any): PetVet {
    return {
      veterinaryId: v?.veterinaryId ?? v?.veterinary_id ?? v?.id ?? '',
      name: v?.name ?? '',
      logoUrl: v?.logoUrl ?? v?.logo_url ?? null,
      city: v?.city ?? '',
      grantedAt: v?.grantedAt ?? v?.granted_at ?? '',
    };
  }

  private toShareResponse(r: any, veterinaryId: string): SharePetsResponse {
    const pets = (r?.pets ?? []).map((p: any) => ({
      petId: p?.petId ?? p?.pet_id ?? '',
      petName: p?.petName ?? p?.pet_name ?? '',
      species: p?.species ?? '',
      grantedAt: p?.grantedAt ?? p?.granted_at ?? '',
      alreadyShared: !!(p?.alreadyShared ?? p?.already_shared),
    }));
    return {
      veterinaryId: r?.veterinaryId ?? r?.veterinary_id ?? veterinaryId,
      veterinaryName: r?.veterinaryName ?? r?.veterinary_name ?? '',
      sharedCount: r?.sharedCount ?? r?.shared_count ?? pets.length,
      pets,
    };
  }
}
