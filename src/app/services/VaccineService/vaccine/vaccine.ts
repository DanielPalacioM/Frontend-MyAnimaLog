import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Vaccine } from 'src/app/models/vaccine.model';

@Injectable({
  providedIn: 'root'
})
export class VaccineService {
  private baseUrl = `${environment.apiUrl}/vaccines`;

  constructor(private http: HttpClient) {}

  createVaccine(vaccine: Partial<Vaccine>): Observable<Vaccine> {
    return this.http.post<Vaccine>(this.baseUrl, vaccine);
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
    return this.http.put<Vaccine>(`${this.baseUrl}/${id}`, data);
  }
}
