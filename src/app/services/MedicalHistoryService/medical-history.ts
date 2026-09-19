import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Visit, Treatment, Medication, LabResult, Surgery } from 'src/app/models/medical-history.model';

@Injectable({
  providedIn: 'root'
})
export class MedicalHistoryService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ============ VISITAS (visits) ============

  createVisit(visit: Partial<Visit>): Observable<Visit> {
    return this.http.post<Visit>(`${this.baseUrl}/visits`, visit);
  }

  getVisitById(id: string): Observable<Visit> {
    return this.http.get<Visit>(`${this.baseUrl}/visits/${id}`);
  }

  getVisitsByPet(petId: string): Observable<Visit[]> {
  return this.http.get<{ success: boolean; data: Visit[]; count: number }>(`${this.baseUrl}/visits/pet/${petId}`).pipe(
    map(response => response.data)
  );
}

  getVisitsByDateRange(startDate: string, endDate: string): Observable<Visit[]> {
    return this.http.get<Visit[]>(`${this.baseUrl}/visits/date-range`, {
      params: { startDate, endDate }
    });
  }

  addTreatmentToVisit(visitId: string, data: { diagnosis: string; notes: string }): Observable<Visit> {
    return this.http.patch<Visit>(`${this.baseUrl}/visits/${visitId}/treatment`, data);
  }

  updateVisit(id: string, data: Partial<Visit>): Observable<Visit> {
  return this.http.put<Visit>(`${this.baseUrl}/visits/${id}`, data);
}

  // ============ TRATAMIENTOS (treatments) ============

  createTreatment(treatment: Partial<Treatment>): Observable<Treatment> {
  return this.http.post<{ success: boolean; data: Treatment }>(`${this.baseUrl}/treatments`, treatment).pipe(
    map(response => response.data)
  );
}

  addMedicationToTreatment(treatmentId: string, medication: Medication): Observable<Treatment> {
    return this.http.post<Treatment>(`${this.baseUrl}/treatments/${treatmentId}/add-medication`, medication);
  }

  isTreatmentActive(treatmentId: string): Observable<{ isActive: boolean }> {
    return this.http.get<{ isActive: boolean }>(`${this.baseUrl}/treatments/${treatmentId}/is-active`);
  }

  getTreatmentById(id: string): Observable<Treatment> {
  return this.http.get<{ success: boolean; data: Treatment }>(`${this.baseUrl}/treatments/${id}`).pipe(
    map(response => response.data)
  );
}

getTreatmentForVisit(visitId: string): Observable<Treatment[]> {
  return this.http.get<{ success: boolean; data: Treatment[]; count: number }>(`${this.baseUrl}/visits/${visitId}/treatment`).pipe(
    map(response => response.data)
  );
}

updateTreatment(id: string, treatment: Partial<Treatment>): Observable<Treatment> {
  return this.http.put<{ success: boolean; data: Treatment }>(`${this.baseUrl}/treatments/${id}`, treatment).pipe(
    map(response => response.data)
  );
}

  deleteTreatment(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/treatments/${id}`);
  }

  // ============ LABORATORIO (lab) ============

  createLabResult(lab: { visit_id: string; name: string; result: string; normal_range: string; date: string; notes?: string }): Observable<LabResult> {
  return this.http.post<LabResult>(`${this.baseUrl}/lab`, lab);
}

  getLabResultsByVisit(visitId: string): Observable<LabResult[]> {
  return this.http.get<LabResult | LabResult[]>(
    `${this.baseUrl}/lab`,
    {
      params: {
        visit_id: visitId
      }
    }
  ).pipe(
    map(response => Array.isArray(response) ? response : [response])
  );
}

  updateLabResult(visitId: string, data: { result: string }): Observable<LabResult> {
  return this.http.patch<LabResult>(`${this.baseUrl}/lab`, data, {
    params: { visit_id: visitId }
  });
}

  // ============ CIRUGÍAS (surgery) ============

  createSurgery(surgery: Partial<Surgery>): Observable<Surgery> {
  return this.http.post<{ success: boolean; data: Surgery }>(`${this.baseUrl}/surgery`, surgery).pipe(
    map(response => response.data)
  );
}

 getSurgeriesByPet(petId: string): Observable<Surgery[]> {
  return this.http.get<{ success: boolean; data: Surgery[]; count: number }>(`${this.baseUrl}/surgery`, {
    params: { petId }
  }).pipe(
    map(response => response.data)
  );
}

 getSurgeryById(id: string): Observable<Surgery> {
  return this.http.get<{ success: boolean; data: Surgery }>(`${this.baseUrl}/surgery/${id}`).pipe(
    map(response => response.data)
  );
}

 updateSurgery(id: string, data: Partial<Surgery>): Observable<Surgery> {
  return this.http.put<{ success: boolean; data: Surgery }>(`${this.baseUrl}/surgery/${id}`, data).pipe(
    map(response => response.data)
  );
}

 updateSurgeryStatus(id: string, data: { status: string; outcome?: string }): Observable<Surgery> {
  return this.http.patch<{ success: boolean; data: Surgery }>(`${this.baseUrl}/surgery/${id}`, data).pipe(
    map(response => response.data)
  );
}

 deleteSurgery(id: string): Observable<any> {
  return this.http.delete(`${this.baseUrl}/surgery/${id}`);
}
}