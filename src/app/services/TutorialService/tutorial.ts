import { Injectable } from '@angular/core';
import { TUTORIAL_STEPS, TUTORIAL_GALLERY } from './tutorial-content';

/**
 * Un paso del tutorial interactivo. `target` es el valor del atributo
 * `data-tour` del elemento a resaltar; sin target el paso se muestra
 * centrado (bienvenida, cierre).
 */
export interface TutorialStep {
  target?: string;
  title: string;
  text: string;
}

/** Una diapositiva del tutorial con imágenes. */
export interface TutorialSlide {
  image: string;
  title: string;
  text: string;
}

export type TutorialKey =
  | 'home-general'
  | 'home-no-pets'
  | 'home-pets'
  | 'pet-profile'
  | 'medical-history'
  | 'vaccine-timeline'
  | 'calendar'
  | 'maps';

// Guías de cada sección: se pueden volver a activar desde el botón de tutorial del Home.
const SECTION_KEYS: TutorialKey[] = ['pet-profile', 'medical-history', 'vaccine-timeline', 'calendar', 'maps'];

@Injectable({ providedIn: 'root' })
export class TutorialService {

  // Por usuario: si dos cuentas usan el mismo teléfono, cada una ve su tutorial.
  private storageKey(key: TutorialKey): string {
    return `tutorial_${key}_${localStorage.getItem('userId') || ''}`;
  }

  hasSeen(key: TutorialKey): boolean {
    return localStorage.getItem(this.storageKey(key)) === 'true';
  }

  markSeen(key: TutorialKey): void {
    localStorage.setItem(this.storageKey(key), 'true');
  }

  resetSections(): void {
    SECTION_KEYS.forEach(key => localStorage.removeItem(this.storageKey(key)));
  }

  getSteps(...keys: TutorialKey[]): TutorialStep[] {
    return ([] as TutorialStep[]).concat(...keys.map(key => TUTORIAL_STEPS[key]));
  }

  getGallery(): TutorialSlide[] {
    return TUTORIAL_GALLERY;
  }
}
