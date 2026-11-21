import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DewormingKind, DewormingKindStatus, PreventionState } from 'src/app/models/pet-health.model';
import {
  DEWORMING_KINDS,
  dewormingKindHint,
  dewormingKindLabel,
  dueText,
  healthDate,
  preventionLabel,
} from 'src/app/shared/utils/pet-health.util';

/**
 * Tarjeta "Desparasitación" del perfil de la mascota, junto a la de vacunas: interna (lombrices) y externa
 * (pulgas y garrapatas) por separado, cada una con su estado (Al día, Por vencer, Vencida, Sin registro) y la próxima dosis.
 */
@Component({
  selector: 'app-prevention-card',
  template: `
    <div class="pc">
      <div class="pc-head">
        <p class="pc-title">Desparasitación</p>
        <span class="pc-link" role="button" tabindex="0" (click)="open.emit()" (keydown.enter)="open.emit()">Ver historial →</span>
      </div>

      <p class="pc-msg" *ngIf="unavailable">Esta sección todavía no está disponible. Vuelve a intentarlo más tarde.</p>

      <ng-container *ngIf="!unavailable">
        <div class="pc-row" *ngFor="let k of kinds" [attr.data-kind]="k">
          <span class="pc-ico" [class.ext]="k === 'EXTERNAL'"><ion-icon [name]="k === 'INTERNAL' ? 'medical-outline' : 'bug-outline'"></ion-icon></span>
          <div class="pc-main">
            <p class="pc-name">{{ label(k) }}<span class="pc-hint"> · {{ hint(k) }}</span></p>
            <p class="pc-sub" *ngIf="status(k)?.registered; else none">
              Última: {{ date(status(k)!.lastApplicationDate) }}
              <ng-container *ngIf="status(k)!.nextDoseDate"> · Próxima {{ due(status(k)!.nextDoseDate) }}<span *ngIf="status(k)!.nextSuggested"> (sugerida)</span></ng-container>
            </p>
            <ng-template #none><p class="pc-sub">Todavía no hay una dosis registrada.</p></ng-template>
          </div>
          <span class="pc-chip" [ngClass]="'tone-' + tone(state(k))">
            <ion-icon [name]="icon(state(k))"></ion-icon>{{ stateLabel(state(k)) }}
          </span>
        </div>
      </ng-container>

      <div class="pc-actions">
        <button type="button" class="pc-btn sec" *ngIf="canEdit" (click)="add.emit()">Registrar</button>
        <button type="button" class="pc-btn pri" (click)="open.emit()">Ver desparasitación</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .pc { background: #fff; border-radius: 16px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, .06); display: flex; flex-direction: column; gap: 10px; font-family: 'Actor', sans-serif; }
    .pc-head { display: flex; align-items: center; justify-content: space-between; }
    .pc-title { margin: 0; font-size: 14px; font-weight: 700; color: #1a1a2e; }
    .pc-link { font-size: 12px; font-weight: 700; color: #4037BE; cursor: pointer; }
    .pc-msg { margin: 0; padding: 6px 0; text-align: center; font-size: 12px; color: #6b6b80; }
    .pc-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: #F7F6FF; }
    .pc-ico { width: 34px; height: 34px; border-radius: 50%; background: #F1F0FB; color: #4037BE; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
    .pc-ico.ext { background: #FFF1DA; color: #B26A00; }
    .pc-main { flex: 1; min-width: 0; }
    .pc-name { margin: 0; font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .pc-hint { font-weight: 400; color: #6b6b80; font-size: 11px; }
    .pc-sub { margin: 2px 0 0; font-size: 12px; color: #4a4860; line-height: 1.3; }
    .pc-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
    .pc-chip ion-icon { font-size: 13px; }
    .tone-ok { background: #E8F5E9; color: #2E7D32; }
    .tone-warn { background: #FFF4E0; color: #B26A00; }
    .tone-bad { background: #FEF3F2; color: #B42318; }
    .tone-mute { background: #F0F0F3; color: #6B6B80; }
    .pc-actions { display: flex; gap: 8px; }
    .pc-btn { flex: 1; border: none; border-radius: 10px; padding: 9px 0; font-family: 'Actor', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; }
    .pc-btn.sec { background: #EFEDFB; color: #4037BE; }
    .pc-btn.pri { background: #4037BE; color: #fff; }
  `],
  standalone: false
})
export class PreventionCardComponent {
  readonly kinds = DEWORMING_KINDS;

  /** Estado por tipo; `null` mientras carga. */
  @Input() prevention: { INTERNAL: DewormingKindStatus; EXTERNAL: DewormingKindStatus } | null = null;
  /** El backend todavía no responde (ruta sin publicar o servicio caído). */
  @Input() unavailable = false;
  @Input() canEdit = true;

  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();

  status(k: DewormingKind): DewormingKindStatus | null { return this.prevention ? this.prevention[k] : null; }
  state(k: DewormingKind): PreventionState { return this.status(k)?.state ?? 'NONE'; }
  label(k: DewormingKind): string { return dewormingKindLabel(k); }
  hint(k: DewormingKind): string { return dewormingKindHint(k); }
  date(iso: string): string { return healthDate(iso); }
  due(iso: string): string { return dueText(iso); }
  stateLabel(s: PreventionState): string { return preventionLabel(s); }

  /** El estado no depende solo del color: cada uno lleva su ícono. */
  tone(s: PreventionState): 'ok' | 'warn' | 'bad' | 'mute' {
    return s === 'OK' ? 'ok' : s === 'DUE_SOON' ? 'warn' : s === 'OVERDUE' ? 'bad' : 'mute';
  }

  icon(s: PreventionState): string {
    return s === 'OK' ? 'checkmark-circle' : s === 'DUE_SOON' ? 'time' : s === 'OVERDUE' ? 'alert-circle' : 'remove-circle';
  }
}
