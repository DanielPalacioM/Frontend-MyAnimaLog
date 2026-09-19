import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PetDocument, DocumentType } from 'src/app/models/pet-document.model';


@Injectable({
  providedIn: 'root'
})
export class DocumentService {
 
  private baseUrl = `${environment.apiUrl}/pets`;
  
  constructor(private http: HttpClient) {}

  private getUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  uploadDocument(petId: string, file: File, type: DocumentType, title: string, description?: string): Observable<PetDocument> {
  const uploadedBy = this.getUserId();

  const formData = new FormData();
  formData.append('file', file);

  const params: any = { uploadedBy, documentType: type, title }; // 👈 documentType, no type
  if (description) {
    params.description = description;
  }

  return this.http.post<PetDocument>(`${this.baseUrl}/${petId}/documents`, formData, {
    params
  });
}

  getDocumentsByPet(petId: string): Observable<PetDocument[]> {
    return this.http.get<PetDocument[]>(`${this.baseUrl}/${petId}/documents`);
  }

  getDocumentsByType(petId: string, type: DocumentType): Observable<PetDocument[]> {
  return this.http.get<PetDocument[]>(`${this.baseUrl}/${petId}/documents/type/${type}`);
}

  getDocumentById(petId: string, docId: string): Observable<PetDocument> {
    return this.http.get<PetDocument>(`${this.baseUrl}/${petId}/documents/${docId}`);
  }

  updateDocumentMetadata(petId: string, docId: string, data: { title?: string; description?: string }): Observable<PetDocument> {
    return this.http.patch<PetDocument>(`${this.baseUrl}/${petId}/documents/${docId}/metadata`, data);
  }

  deleteDocument(petId: string, docId: string): Observable<any> {
    const requestedBy = this.getUserId();
    return this.http.delete(`${this.baseUrl}/${petId}/documents/${docId}`, {
      params: { requestedBy }
    });
  }

  getDownloadUrl(petId: string, docId: string): Observable<{ downloadUrl: string }> {
    const requestedBy = this.getUserId();
    return this.http.get<{ downloadUrl: string }>(`${this.baseUrl}/${petId}/documents/${docId}/download-url`, {
      params: { requestedBy }
    });
  }
}


