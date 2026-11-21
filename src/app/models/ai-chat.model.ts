// Chat con la IA de MyAnimaLog. Contrato real del IA-service en docs/IA_CHAT_CONTRATO.md y
// docs/coleccion de postman/MyAnimaLog-IA-service.postman_collection.json.

/** Nombre con el que la IA se presenta. Se cambia aquí. */
export const AI_NAME = 'MyAnimaLog IA';

export type AiRole = 'user' | 'assistant';

/** Archivo adjunto tal como se muestra en la conversación (no guarda el contenido). */
export interface AiAttachment {
  name: string;
  size: number;
  type: string;
  /** URL local (blob:) para mostrar la miniatura de una imagen. No se guarda entre sesiones. */
  previewUrl?: string;
}

/**
 * Acción que la IA propone y el usuario debe confirmar (crear mascota, agendar cita, registrar vacuna).
 * Nada se escribe hasta que el usuario toca "Confirmar".
 */
export interface AiPendingAction {
  id: string;
  description: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';
}

export interface AiMessage {
  id: string;
  role: AiRole;
  text: string;
  attachments?: AiAttachment[];
  createdAt: string;
  /** Mensaje de error del asistente (no se guarda). */
  error?: boolean;
  /** Mensaje de bienvenida de la primera vez: no se guarda en la conversación. */
  intro?: boolean;
  /** Acción por confirmar (solo en mensajes del asistente). */
  pendingAction?: AiPendingAction;
}

/** Una conversación guardada en el historial (barra lateral). */
export interface AiChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Id de la conversación en el IA-service (guarda el historial del lado del servidor). */
  conversationId?: string;
  messages: AiMessage[];
  /** Chat que solo está en el servidor: se muestra en el historial y sus mensajes se traen al abrirlo. */
  remote?: boolean;
}

/** En qué pantalla está el usuario cuando escribe desde el mini chat (modo seguimiento). */
export interface AiContext {
  screen: string;
  label: string;
  petId?: string;
}

export interface AiReply {
  reply: string;
  conversationId?: string;
  pendingAction?: AiPendingAction | null;
  model?: string;
}

export type AiErrorCode =
  | 'NOT_AVAILABLE'
  | 'CONVERSATION_NOT_FOUND'
  | 'ACTION_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'TOO_LARGE'
  | 'UNSUPPORTED'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'UNKNOWN';

export interface AiError {
  code: AiErrorCode;
  status: number;
  message: string;
}
