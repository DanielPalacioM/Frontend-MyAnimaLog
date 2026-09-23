import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Vaccine } from 'src/app/models/vaccine.model';

@Injectable({
  providedIn: 'root'
})
export class VaccineService {
  private baseUrl = `${environment.apiUrl}/vaccines`;

  constructor(private http: HttpClient) {}

  private getUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  createVaccine(vaccine: Partial<Vaccine>): Observable<Vaccine> {
    const userId = this.getUserId();
    return this.http.post<Vaccine>(this.baseUrl, { ...vaccine, userId });
  }

  getVaccinesByPet(petId: string): Observable<Vaccine[]> {
    return this.http.get<Vaccine[]>(this.baseUrl, {
      params: { petId }
    });
  }

  isVaccineDue(id: string): Observable<{ isDue: boolean }> {
    return this.http.get<{ isDue: boolean }>(`${this.baseUrl}/${id}/due`);
  }

  updateVaccine(id: string, data: Partial<Vaccine>): Observable<Vaccine> {
    const userId = this.getUserId();
    return this.http.put<Vaccine>(`${this.baseUrl}/${id}`, { ...data, userId });
  }
}