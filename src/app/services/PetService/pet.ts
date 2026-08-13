import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { PetForm } from 'src/app/views/add-pet/add-pet.component';
import { environment } from 'src/environments/environment';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  ageMonths: number | null;
  imageUrl: string | null;
  sex?: string;
  weight?: number | null;
  height?: number | null;
  vaccine: { type: string; date: string; nextDate?: string } | null;
  documentIds: string[];
  vetName: string;
  sharedWith: { avatarUrl: string }[];
  createdAt: string;
}

export interface PetDocument {
  id: string;
  petId: string;
  fileName: string;
  uploadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PetService {
  private baseUrl = `${environment.apiUrl}/pets`;
  constructor(private http: HttpClient) {}

  private getOwnerId(): string {
    return localStorage.getItem('userId') || '';
  }

  private mapPet(raw: any): Pet {
  return {
    ...raw,
    imageUrl: raw.photoUrl ?? raw.imageUrl ?? null,
  };
}

private mapPets(raw: any[]): Pet[] {
  return raw.map(p => this.mapPet(p));
}

 getPets(): Observable<Pet[]> {
  const ownerId = this.getOwnerId();
  if (!ownerId) {
    console.warn('⚠️ No hay ownerId disponible, no se pueden cargar mascotas');
    return new Observable<Pet[]>((observer) => {
      observer.next([]);
      observer.complete();
    });
  }
  return this.http.get<any[]>(`${this.baseUrl}/user/${ownerId}`).pipe(
    map(raw => this.mapPets(raw))
  );
}

getPetById(id: string): Observable<Pet> {
  const ownerId = this.getOwnerId();
  return this.http.get<any>(`${this.baseUrl}/${id}`, {
    params: { ownerId }
  }).pipe(
    map(raw => this.mapPet(raw))
  );
}

  getPetAge(id: string): Observable<{ ageMonths: number }> {
    return this.http.get<{ ageMonths: number }>(`${this.baseUrl}/${id}/age`);
  }

  createPet(form: PetForm): Observable<Pet> {
  const ownerId = this.getOwnerId();
  const payload = {
    ownerId,
    name: form.name,
    species: form.species,
    breed: form.breed,
    sex: form.sex,
    weightKg: form.weightKg,
    heightCm: form.heightCm,
    birthDate: form.birthDate,
    ageMonths: form.ageMonths,
    vaccine: form.vaccine,
    vetName: form.vetName,
  };
  return this.http.post<any>(this.baseUrl, payload).pipe(
    map(raw => this.mapPet(raw))
  );
}

  addPet(form: PetForm): Observable<Pet> {
    return this.createPet(form).pipe(
      switchMap((pet) => {
        const uploads: Observable<any>[] = [];

        if (form.photo) {
          uploads.push(this.uploadPhoto(pet.id, form.photo));
        }
        if (form.document) {
          uploads.push(this.uploadDocument(pet.id, form.document));
        }

        if (uploads.length === 0) {
          return new Observable<Pet>((observer) => {
            observer.next(pet);
            observer.complete();
          });
        }

        return this.combineUploads(uploads, pet);
      })
    );
  }

  private combineUploads(uploads: Observable<any>[], pet: Pet): Observable<Pet> {
    let remaining = uploads.length;
    return new Observable<Pet>((observer) => {
      uploads.forEach((upload$) => {
        upload$.subscribe({
          next: () => {
            remaining--;
            if (remaining === 0) {
              observer.next(pet);
              observer.complete();
            }
          },
          error: (err) => observer.error(err)
        });
      });
    });
  }

  uploadPhoto(petId: string, base64Photo: string): Observable<any> {
  const ownerId = this.getOwnerId();
  const file = this.base64ToFile(base64Photo, `pet-${petId}.jpg`);
  const formData = new FormData();
  formData.append('file', file);

  return this.http.patch(`${this.baseUrl}/${petId}/photo`, formData, {
    params: { ownerId }
  });
}

deletePhoto(petId: string): Observable<any> {
  const ownerId = this.getOwnerId();
  return this.http.delete(`${this.baseUrl}/${petId}/photo`, {
    params: { ownerId }
  });
}

  uploadDocument(petId: string, file: File): Observable<PetDocument> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<PetDocument>(`${this.baseUrl}/${petId}/documents`, formData);
  }

  deleteDocument(petId: string, documentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${petId}/documents/${documentId}`);
  }

  updatePet(id: string, form: Partial<PetForm>): Observable<Pet> {
  const ownerId = this.getOwnerId();
  const payload = {
    ...(form.name !== undefined && { name: form.name }),
    ...(form.species !== undefined && { species: form.species }),
    ...(form.breed !== undefined && { breed: form.breed }),
    ...(form.sex !== undefined && { sex: form.sex }),
    ...(form.weightKg !== undefined && { weight: form.weightKg }),
    ...(form.heightCm !== undefined && { height: form.heightCm }),
    ...(form.birthDate !== undefined && { birthDate: form.birthDate }),
    ...(form.ageMonths !== undefined && { ageMonths: form.ageMonths }),
    ...(form.vaccine !== undefined && { vaccine: form.vaccine }),
    ...(form.vetName !== undefined && { vetName: form.vetName }),
  };

  return this.http.patch<any>(`${this.baseUrl}/${id}`, payload, {
    params: { ownerId }
  }).pipe(
    map(raw => this.mapPet(raw)),
    switchMap((pet) => {
      if (form.photo) {
        return this.uploadPhoto(id, form.photo).pipe(
          switchMap(() => new Observable<Pet>((observer) => {
            observer.next(pet);
            observer.complete();
          }))
        );
      }
      return new Observable<Pet>((observer) => {
        observer.next(pet);
        observer.complete();
      });
    })
  );
}

  deletePet(id: string): Observable<any> {
    const ownerId = this.getOwnerId();
    return this.http.delete(`${this.baseUrl}/${id}`, {
      params: { ownerId }
    });
  }

  private base64ToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}