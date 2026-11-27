import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Allergy, AllergySeverity, HealthSummary } from 'src/app/models/pet-health.model';
import {
  allergySeverityLabel,
  allergyStatusLabel,
  isActiveAllergy,
  neuteredLabel,
  neuteredOrigin,
} from 'src/app/shared/utils/pet-health.util';

/**
 * Tarjeta "Salud y alertas" del perfil de la mascota: esterilización y alergias de un vistazo.
 * "No sé" no es "no tiene": con el dato sin preguntar la tarjeta lo dice, nunca afirma que no hay alergias.
 */
@Component({
  selector: 'app-health-card',
  template: `
    <div class="hc">
      <div class="hc-head">
        <p class="hc-title">Salud y alertas</p>
        <span class="hc-link" role="button" tabindex="0" (click)="open.emit()" (keydown.enter)="open.emit()">Ver todo →</span>
      </div>

      <p class="hc-msg" *ngIf="unavailable">Esta sección todavía no está disponible. Vuelve a intentarlo más tarde.</p>

      <ng-container *ngIf="!unavailable && summary">
        <div class="hc-row" data-row="neutered">
          <span class="hc-ico"><ion-icon name="shield-checkmark-outline"></ion-icon></span>
          <div class="hc-main">
            <p class="hc-name">Esterilizada</p>
            <p class="hc-sub" *ngIf="summary.neuteredUnavailable">Pronto podrás indicarlo aquí</p>
            <p class="hc-sub" *ngIf="!summary.neuteredUnavailable">{{ neutered }}<span *ngIf="neuteredFrom"> · {{ neuteredFrom }}</span></p>
          </div>
        </div>

        <div class="hc-row" data-row="allergies">
          <span class="hc-ico warn"><ion-icon name="warning-outline"></ion-icon></span>
          <div class="hc-main">
            <p class="hc-name">Alergias</p>
            <p class="hc-sub" *ngIf="!active.length">{{ allergyStatus }}</p>
            <div class="hc-tags" *ngIf="active.length">
              <span class="hc-tag" *ngFor="let a of active.slice(0, 3)" [ngClass]="'sev-' + a.severity.toLowerCase()">
                {{ a.allergen }}<small> · {{ severity(a.severity) }}</small>
              </span>
              <span class="hc-more" *ngIf="active.length > 3">+{{ active.length - 3 }}</span>
            </div>
          </div>
        </div>

      </ng-container>

      <div class="hc-actions">
        <button type="button" class="hc-btn" (click)="open.emit()">{{ canEdit ? 'Ver y agregar' : 'Ver' }}</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .hc { background: #fff; border-radius: 16px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, .06); display: flex; flex-direction: column; gap: 10px; font-family: 'Actor', sans-serif; }
    .hc-head { display: flex; align-items: center; justify-content: space-between; }
    .hc-title { margin: 0; font-size: 14px; font-weight: 700; color: #1a1a2e; }
    .hc-link { font-size: 12px; font-weight: 700; color: #4037BE; cursor: pointer; }
    .hc-msg { margin: 0; padding: 6px 0; text-align: center; font-size: 12px; color: #6b6b80; }
    .hc-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 12px; background: #F7F6FF; }
    .hc-ico { width: 34px; height: 34px; border-radius: 50%; background: #F1F0FB; color: #4037BE; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
    .hc-ico.warn { background: #FFF1DA; color: #B26A00; }
    .hc-main { flex: 1; min-width: 0; }
    .hc-name { margin: 0; font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .hc-sub { margin: 2px 0 0; font-size: 12px; color: #4a4860; line-height: 1.3; }
    .hc-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .hc-tag { padding: 3px 8px; border-radius: 10px; font-size: 12px; font-weight: 700; }
    .hc-tag small { font-weight: 400; font-size: 11px; }
    .sev-severe { background: #FEF3F2; color: #B42318; }
    .sev-moderate { background: #FFF4E0; color: #B26A00; }
    .sev-mild { background: #F0F0F3; color: #3D3D4E; }
    .hc-more { align-self: center; font-size: 12px; font-weight: 700; color: #6b6b80; }
    .hc-actions { display: flex; }
    .hc-btn { flex: 1; border: none; border-radius: 10px; padding: 9px 0; background: #EFEDFB; color: #4037BE; font-family: 'Actor', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; }
  `],
  standalone: false
})
export class HealthCardComponent {
  @Input() summary: HealthSummary | null = null;
  /** El backend todavía no responde (ruta sin publicar o servicio caído). */
  @Input() unavailable = false;
  @Input() canEdit = true;

  @Output() open = new EventEmitter<void>();

  get active(): Allergy[] {
    return (this.summary?.allergies ?? []).filter(isActiveAllergy);
  }

  get neutered(): string {
    return this.summary ? neuteredLabel(this.summary.neutered) : '';
  }

  get neuteredFrom(): string {
    return this.summary ? neuteredOrigin(this.summary.neutered) : '';
  }

  get allergyStatus(): string {
    return this.summary ? allergyStatusLabel(this.summary.allergyStatus) : '';
  }

  severity(s: AllergySeverity): string {
    return allergySeverityLabel(s);
  }
}
