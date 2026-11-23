// Citas con una clínica, vistas por el dueño (calendar-service). Rutas en AppointmentService.
// Contrato: Postman "Calendar Microservice" (carpeta 2) y docs/MYANIMALOG_VET_BACKEND_CONTRATO.md §G y §H.

export type AppointmentStatus =
  | 'REQUESTED'   // el dueño la pidió y la clínica aún no responde
  | 'CONFIRMED'
  | 'CHECKED_IN'  // ya llegó a la clínica
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'REJECTED';   // la clínica la rechazó

/** Cita del dueño (`GET /me/appointments`, `POST …/appointment-requests`). */
export interface Appointment {
  id: string;
  veterinaryId: string;
  clinicName: string;
  clinicLogoUrl: string | null;
  address: string;
  petId: string;
  petName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  /** Precio que quedó fijo al pedir la cita. */
  price: number | null;
  employeeName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  /** `APP` si la pidió el dueño, `CLINIC` si la agendó la clínica. */
  origin: 'APP' | 'CLINIC';
  notes: string;
  cancellationReason: string;
  cancelledBy: 'OWNER' | 'CLINIC' | '';
  /** Hasta cuándo puede cancelar el dueño. `null` si el backend no lo manda (se calcula con 24 h). */
  cancellableUntil: string | null;
}

/** Servicio que la clínica deja reservar en línea (`GET /veterinaries/{id}/services`). */
export interface BookableService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
}

/** Franja libre. `employeeId` es el profesional que el servidor asignaría. */
export interface TimeSlot {
  startsAt: string;
  endsAt: string;
  employeeId: string;
  employeeName: string;
}

export interface DaySlots {
  /** `YYYY-MM-DD` en hora de Bogotá. */
  date: string;
  slots: TimeSlot[];
  /** La clínica no atiende ese día. */
  closed: boolean;
}

/** De dónde salen las franjas: del servidor, o de una cuadrícula local mientras no exista `availability`. */
export type AvailabilitySource = 'server' | 'grid';

export interface Availability {
  days: DaySlots[];
  source: AvailabilitySource;
}

export interface BookingRequest {
  serviceId: string;
  petId: string;
  startsAt: string;
  notes?: string;
}

/** Códigos de error de citas que la app distingue (los de Calendar y los del contrato). */
export type AppointmentErrorCode =
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_TAKEN'
  | 'SLOT_TOO_SOON'
  | 'PET_NOT_OWNED'
  | 'PET_NOT_SHARED'
  | 'ONLINE_BOOKING_DISABLED'
  | 'VETERINARY_NOT_ACTIVE'
  | 'FEATURE_NOT_IN_PLAN'
  | 'CANCELLATION_WINDOW_CLOSED'
  | 'OWNER_TOKEN_REQUIRED'
  | 'MISSING_TOKEN'
  | 'VALIDATION_ERROR'
  | 'NETWORK'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export interface AppointmentError {
  code: AppointmentErrorCode;
  status: number;
  message: string;
}
