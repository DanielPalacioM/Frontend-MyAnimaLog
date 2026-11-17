import { Component, Input } from '@angular/core';
import { vetInitials } from '../../utils/vet.util';

/** Logo de la clínica, o sus iniciales ("CP") sobre morado si no tiene logo o no carga. */
@Component({
  selector: 'app-vet-avatar',
  template: `
    <span class="vet-avatar" [class.inverse]="inverse" [style.width.px]="size" [style.height.px]="size"
          [style.font-size.px]="size * 0.36">
      <img *ngIf="logoUrl && !broken" [src]="logoUrl" alt="" (error)="broken = true" />
      <ng-container *ngIf="!logoUrl || broken">{{ initials }}</ng-container>
    </span>
  `,
  styles: [`
    .vet-avatar { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
      border-radius: 50%; background: #4037BE; color: #fff; font-family: 'Jua', sans-serif; overflow: hidden; }
    .vet-avatar.inverse { background: #fff; color: #4037BE; }
    img { width: 100%; height: 100%; object-fit: cover; }
  `],
  standalone: false
})
export class VetAvatarComponent {
  @Input() name = '';
  @Input() logoUrl: string | null | undefined = null;
  @Input() size = 48;
  /** Fondo blanco con letras moradas (para usarlo sobre la tarjeta morada). */
  @Input() inverse = false;
  broken = false;

  get initials(): string { return vetInitials(this.name); }
}
