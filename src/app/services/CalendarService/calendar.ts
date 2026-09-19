import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CalendarEvent, CalendarEventPayload } from 'src/app/models/calendar-event.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private baseUrl = `${environment.apiUrl}/calendar-events`;

  constructor(private http: HttpClient) {}

  private getUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  getAllUserEvents(): Observable<CalendarEvent[]> {
    const userId = this.getUserId();
    return this.http.get<{ events: CalendarEvent[]; user_id: string; pet_id: string | null }>(this.baseUrl, {
      params: { userId }
    }).pipe(
      map(response => response.events)
    );
  }

  createEvent(payload: Omit<CalendarEventPayload, 'userId'>): Observable<CalendarEvent> {
    const userId = this.getUserId();
    return this.http.post<CalendarEvent>(this.baseUrl, { ...payload, userId });
  }

  updateEvent(id: string, payload: Partial<CalendarEventPayload>): Observable<CalendarEvent> {
    const userId = this.getUserId();
    return this.http.put<CalendarEvent>(`${this.baseUrl}/${id}`, { ...payload, userId });
  }

  deleteEvent(id: string): Observable<any> {
    const userId = this.getUserId();
    return this.http.delete(`${this.baseUrl}/${id}`, {
      params: { userId }
    });
  }
}