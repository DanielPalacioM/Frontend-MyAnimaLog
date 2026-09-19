export type EventType = 'VET_APPOINTMENT' | 'MEDICATION' | 'TREATMENT' | 'GROOMING' | 'OTHER';

// Colores/íconos por defecto según el tipo de evento, usados cuando el backend
// no envía "color"/"icon" explícitos para un evento.
export const EVENT_TYPE_DEFAULTS: Record<EventType, { color: string; icon: string }> = {
  VET_APPOINTMENT: { color: '#4037BE', icon: 'paw-outline' },
  MEDICATION: { color: '#FF6B6B', icon: 'medical-outline' },
  TREATMENT: { color: '#38B77C', icon: 'bandage-outline' },
  GROOMING: { color: '#F5A623', icon: 'cut-outline' },
  OTHER: { color: '#8E8E93', icon: 'calendar-outline' },
};

// Forma en que el backend DEVUELVE los eventos (GET) — snake_case
export interface CalendarEvent {
  id: string;
  user_id: string;
  pet_id: string | null;
  title: string;
  description?: string;
  event_type: EventType;
  event_date: string;
  reminder_at?: string;
  reminder_enabled: boolean;
  created_at?: string;
  updated_at?: string;
  reminder_sent?: boolean;
  reminder_attempts?: number;
  color?: string;  // ⚠️ pendiente: confirmar si el backend lo soporta realmente
  icon?: string;    // ⚠️ pendiente: confirmar si el backend lo soporta realmente
}

// Forma en que el backend ESPERA los eventos al crear/actualizar (POST/PUT) — camelCase
export interface CalendarEventPayload {
  petId?: string;
  userId: string;
  title: string;
  description?: string;
  eventType: EventType;
  eventDate: string;
  reminderAt?: string;
  reminderEnabled: boolean;
  color?: string;
  icon?: string;
}