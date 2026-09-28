export type AccessRole = 'EDITOR' | 'VIEWER';

// Rol efectivo del usuario logueado sobre una mascota.
export type PetRole = 'OWNER' | AccessRole;

export interface PetAccess {
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  accessRole: AccessRole;
}

export interface SharedPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex?: string;
  birthDate?: string;
  ageMonths?: number | null;
  weight?: number | null;
  height?: number | null;
  imageUrl: string | null;
  ownerId: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  accessRole: AccessRole;
}

export interface PetInvitation {
  id: string;
  // Accept / reject / expired se hacen con este token, no con el id.
  token: string;
  petId: string;
  petName?: string;
  petImageUrl?: string | null;
  // Quién envía la invitación (el dueño). Si el backend no lo manda, el
  // front lo intenta resolver con la mascota + el perfil del dueño.
  ownerId?: string;
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  email: string;
  accessRole: AccessRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  expiresAt?: string;
}