export type NotificationType =
  | 'GENERAL'
  | 'PET_INVITATION'
  | 'SHARED_ACCESS'
  | 'MEDICAL'
  | 'VACCINE_DUE'
  | 'VETERINARY_ALERT';

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
