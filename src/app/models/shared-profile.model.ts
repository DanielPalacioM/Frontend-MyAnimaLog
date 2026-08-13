export type AccessRole = 'EDITOR' | 'VIEWER';

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
  imageUrl: string | null;
  ownerId: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  accessRole: AccessRole;
}

export interface PetInvitation {
  id: string;
  petId: string;
  email: string;
  accessRole: AccessRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}