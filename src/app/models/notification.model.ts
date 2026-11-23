export type NotificationType =
  | 'GENERAL'
  | 'PET_INVITATION'
  | 'SHARED_ACCESS'
  | 'MEDICAL'
  | 'VACCINE_DUE'
  | 'VETERINARY_ALERT'
  // Vet (contrato §6): citas y vínculo con la clínica. Aún no están en el enum del backend; se aceptan como texto.
  | 'APPOINTMENT_REQUESTED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_REJECTED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_COMPLETED'
  | 'USER_LINKED'
  | 'PET_CLAIMED';

// Forma real de una notificación tal como la devuelve el NotificationMicroservice.
export interface AppNotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  sendAt: string;
  createdAt: string;
  updatedAt: string;
}

// GET /notifications?userId=...&read=...
export interface NotificationListResponse {
  success: boolean;
  count: number;
  notifications: AppNotificationDto[];
}

// POST /notifications
export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  sendAt: string;
}
