import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FabStored } from 'src/app/shared/utils/ai-fab.util';

/**
 * Acceso al asistente de IA y estado de su botón.
 *
 * El botón tiene dos modos:
 * - **Seguimiento** (flotante): acompaña al usuario en todas las pantallas. Un toque abre el mini chat; mantenerlo
 *   presionado abre el chat completo; arrastrarlo a "Ocultar" lo pasa al modo anclado.
 * - **Anclado**: queda junto al menú (≡) del Inicio. Un toque abre el chat completo; mantenerlo presionado ofrece
 *   volver al modo seguimiento. (En el código, "oculto" = anclado: `isFabHidden`.)
 *
 * El asistente será una función de plan de pago. Por ahora **se valida sin plan**: `canUseAi()` deja pasar a todos.
 * Cuando exista el plan, se pone `environment.ai.requiresPlan = true` y se conecta `hasPaidPlan()`.
 */
@Injectable({ providedIn: 'root' })
export class AiAccessService {
  /** Avisa cuando el botón cambia de modo (flotante ↔ anclado junto al menú). */
  readonly fabChanged$ = new Subject<void>();

  /** Mini chat del modo seguimiento (panel lateral desplegable). */
  readonly miniOpen$ = new BehaviorSubject<boolean>(false);

  openMini(): void { this.miniOpen$.next(true); }
  closeMini(): void { this.miniOpen$.next(false); }
  toggleMini(): void { this.miniOpen$.next(!this.miniOpen$.value); }

  /** De dónde sale la animación de entrada al chat (el centro del botón). Se consume una sola vez. */
  private launchOrigin: { x: number; y: number } | null = null;

  canUseAi(): boolean {
    return !environment.ai?.requiresPlan || this.hasPaidPlan();
  }

  /** Pendiente: consultar el plan del usuario cuando exista. */
  private hasPaidPlan(): boolean {
    return false;
  }

  private get uid(): string { return localStorage.getItem('userId') || ''; }
  private get hiddenKey(): string { return `aiFabHidden_${this.uid}`; }
  private get posKey(): string { return `aiFabPos_${this.uid}`; }

  isFabHidden(): boolean {
    try { return localStorage.getItem(this.hiddenKey) === 'true'; } catch { return false; }
  }

  /** Pasa al modo anclado (el botón se va junto al menú del Inicio). */
  hideFab(): void {
    try { localStorage.setItem(this.hiddenKey, 'true'); } catch { /* se ancla solo hasta recargar */ }
    this.miniOpen$.next(false);
    this.fabChanged$.next();
  }

  /** Vuelve al modo seguimiento (el botón flota otra vez). */
  showFab(): void {
    try { localStorage.removeItem(this.hiddenKey); } catch { /* nada */ }
    this.fabChanged$.next();
  }

  getFabPosition(): FabStored | null {
    try {
      const raw = JSON.parse(localStorage.getItem(this.posKey) || 'null');
      return raw && (raw.side === 'left' || raw.side === 'right') && typeof raw.yFrac === 'number' ? raw : null;
    } catch { return null; }
  }

  saveFabPosition(p: FabStored): void {
    try { localStorage.setItem(this.posKey, JSON.stringify(p)); } catch { /* sin guardar */ }
  }

  setLaunchOrigin(o: { x: number; y: number }): void { this.launchOrigin = o; }

  takeLaunchOrigin(): { x: number; y: number } | null {
    const o = this.launchOrigin;
    this.launchOrigin = null;
    return o;
  }
}
