export type EventType = 'VET_APPOINTMENT' | 'MEDICATION' | 'TREATMENT' | 'GROOMING' | 'OTHER';

export const EVENT_TYPE_DEFAULTS: Record<EventType, { color: string; icon: string }> = {
  VET_APPOINTMENT: { color: '#4037BE', icon: 'paw-outline' },
  MEDICATION: { color: '#FF6B6B', icon: 'medical-outline' },
  TREATMENT: { color: '#38B77C', icon: 'bandage-outline' },
  GROOMING: { color: '#F5A623', icon: 'cut-outline' },
  OTHER: { color: '#8E8E93', icon: 'calendar-outline' },
};

export interface CalendarEvent {
  id: string;
  user_id: string;
  pet_id: string | null;
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date?: string;
  location?: string;
  reminder_at?: string;
  reminder_enabled: boolean;
  created_at?: string;
  updated_at?: string;
  reminder_sent?: boolean;
  reminder_attempts?: number;
  color?: string;
  icon?: string;
}

export interface CalendarEventPayload {
  petId?: string;
  userId: string;
  title: string;
  description?: string;
  eventType: EventType;
  startDate: string;
  endDate?: string;
  location?: string;
  reminderAt?: string;
  reminderEnabled: boolean;
  color?: string;
  icon?: string;
}