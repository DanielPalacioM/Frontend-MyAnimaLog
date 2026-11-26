/**
 * Lo que dice y hace el perrito cada vez que lo tocan en el saludo del Home.
 * Cada toque pasa a la siguiente reacción: un movimiento (`act`) con su globo de diálogo (`say`).
 * La última invita a hablar con la IA: el toque siguiente abre el mini chat.
 */

/** Movimientos del perrito al tocarlo (clases `act-*` de app-mascot). */
export type MascotAct = 'wave' | 'jump' | 'shake' | 'tilt' | 'wag' | 'wake';

export interface MascotReaction {
  act: MascotAct;
  say: string;
  /** Después de esta, el siguiente toque abre el chat de la IA. */
  chat?: boolean;
}

/** Cuánto dura cada movimiento (ms), igual que en mascot.component.scss. */
export const ACT_MS: Record<MascotAct, number> = { wave: 1200, jump: 800, shake: 850, tilt: 1250, wag: 950, wake: 1350 };

/** Cuánto se queda el globo de diálogo antes de volver al del saludo. */
export const SAY_MS = 4500;

const CHAT: MascotReaction = { act: 'wave', say: '¿Hablamos? Tócame otra vez 💬', chat: true };

export const DAY_TALK: MascotReaction[] = [
  { act: 'wave', say: '¡Hola otra vez! 👋' },
  { act: 'jump', say: '¡Guau! ¡Qué alegría verte!' },
  { act: 'shake', say: '¡Jiji, me haces cosquillas!' },
  { act: 'tilt', say: '¿Qué hacemos hoy?' },
  { act: 'wag', say: '¡Tus mascotas te quieren mucho!' },
  CHAT
];

export const NIGHT_TALK: MascotReaction[] = [
  { act: 'wake', say: '¿Eh? ¡Ah, eras tú! 😴' },
  { act: 'wave', say: '¡Buenas noches! 👋' },
  { act: 'wake', say: 'Cinco minutitos más…' },
  { act: 'wag', say: 'Mañana jugamos, ¿sí?' },
  CHAT
];

/** La reacción del toque número `step` (desde 0); vuelve a empezar al acabar la lista. */
export function mascotReaction(step: number, night: boolean): MascotReaction {
  const list = night ? NIGHT_TALK : DAY_TALK;
  return list[((step % list.length) + list.length) % list.length];
}
