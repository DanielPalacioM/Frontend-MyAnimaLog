import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AiPendingAction } from 'src/app/models/ai-chat.model';

/**
 * Tarjeta con la acción que propone la IA (crear una mascota, agendar una cita, registrar una vacuna).
 * No se escribe nada hasta que el usuario toca "Confirmar".
 */
@Component({
  selector: 'app-ai-action-card',
  template: `
    <div class="card" [class.done]="action.status !== 'PENDING'">
      <p class="label"><ion-icon name="sparkles-outline"></ion-icon> Acción propuesta</p>
      <p class="desc">{{ action.description }}</p>

      <div class="buttons" *ngIf="action.status === 'PENDING'">
        <button type="button" class="reject" [disabled]="busy" (click)="rejected.emit()">Cancelar</button>
        <button type="button" class="confirm" [disabled]="busy" (click)="confirmed.emit()">{{ busy ? 'Un momento...' : 'Confirmar' }}</button>
      </div>

      <p class="state" *ngIf="action.status !== 'PENDING'" [class.ok]="action.status === 'CONFIRMED'">
        <ion-icon [name]="icon"></ion-icon> {{ stateText }}
      </p>
    </div>
  `,
  styles: [`
    :host { display: block; margin-top: 8px; }
    .card { background: #fff; color: #1a1a2e; border-radius: 12px; padding: 9px 11px; box-shadow: 0 1px 3px rgba(120, 70, 0, .22); font-family: 'Actor', sans-serif; }
    .card.done { opacity: .85; }
    .label { margin: 0 0 3px; font-size: 11px; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; color: #B26A00; display: flex; align-items: center; gap: 4px; }
    .desc { margin: 0 0 8px; font-size: 13.5px; line-height: 1.35; font-weight: 700; }
    .buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    button { height: 34px; border-radius: 10px; font-family: 'Actor', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; border: 1.5px solid #f5a623; }
    button:disabled { opacity: .55; cursor: default; }
    .reject { background: #fff; color: #B26A00; }
    .confirm { background: #f5a623; color: #1a1a2e; }
    .state { margin: 0; font-size: 12.5px; color: #6b6b80; display: flex; align-items: center; gap: 5px; }
    .state.ok { color: #1E6B3E; }
  `],
  standalone: false
})
export class AiActionCardComponent {
  @Input() action!: AiPendingAction;
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();

  get icon(): string {
    return this.action.status === 'CONFIRMED' ? 'checkmark-circle-outline' : this.action.status === 'REJECTED' ? 'close-circle-outline' : 'time-outline';
  }

  get stateText(): string {
    switch (this.action.status) {
      case 'CONFIRMED': return 'Confirmada';
      case 'REJECTED': return 'Cancelada';
      default: return 'Ya no está disponible';
    }
  }
}
