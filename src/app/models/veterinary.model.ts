// Parte Vet del dueño (veterinary-service, Fase 4A). Rutas en VeterinaryService.

/** Vista previa de una clínica por código: solo datos públicos. */
export interface VetPreview {
  veterinaryId: string;
  name: string;
  logoUrl: string | null;
  city: string;
  department: string;
  address: string;
  alreadyLinked: boolean;
}

/** Resultado de vincularse (idempotente: si ya estaba vinculado, `alreadyLinked` = true). */
export interface VetLinkResult {
  id: string;
  veterinaryId: string;
  veterinaryName: string;
  logoUrl: string | null;
  linkedAt: string;
  alreadyLinked: boolean;
}

/** Clínica donde estoy vinculado hoy. */
export interface LinkedVet {
  veterinaryId: string;
  name: string;
  logoUrl: string | null;
  city: string;
  phone: string;
  status: string;
  linkedAt: string;
  sharedPetsCount: number;
}

/** Clínica que ve una mascota concreta. */
export interface PetVet {
  veterinaryId: string;
  name: string;
  logoUrl: string | null;
  city: string;
  grantedAt: string;
}

export interface SharedPetResult {
  petId: string;
  petName: string;
  species: string;
  grantedAt: string;
  alreadyShared: boolean;
}

export interface SharePetsResponse {
  veterinaryId: string;
  veterinaryName: string;
  sharedCount: number;
  pets: SharedPetResult[];
}

export interface RevokePetResponse {
  veterinaryId: string;
  petId: string;
  petName: string;
  revokedAt: string;
  alreadyRevoked: boolean;
}

export interface UnlinkResponse {
  veterinaryId: string;
  revokedPetsCount: number;
}

/** Códigos de error del backend que la app distingue. */
export type VetErrorCode =
  | 'INVALID_INVITE_CODE'
  | 'LINK_CODE_NOT_FOUND'
  | 'PET_NOT_OWNED'
  | 'NOT_LINKED_TO_VETERINARY'
  | 'CLINIC_NOT_ACTIVE'
  | 'USER_NOT_LINKED'
  | 'VETERINARY_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'EXTERNAL_SERVICE_UNAVAILABLE'
  | 'NETWORK'
  | 'UNKNOWN';

export interface VetError {
  code: VetErrorCode;
  status: number;
  message: string;
}
