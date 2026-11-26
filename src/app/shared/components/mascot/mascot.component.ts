import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Input, OnDestroy } from '@angular/core';
import { MascotPose } from 'src/app/shared/utils/home-today.util';
import { ACT_MS, MascotAct } from 'src/app/shared/utils/mascot-talk.util';

/**
 * El perrito de MyAnimaLog por capas (cola, cuerpo, orejas, cabeza, ojos y la pata que saluda), animado con CSS.
 * El dibujo sale del logo («logo app.png») vectorizado por piezas: ver design/mascota/README.md.
 *
 * - `intro`: entra con un salto y saluda agitando la pata 3 veces (Figma: 0–450 ms y 450–1600 ms). Una vez por sesión.
 * - `pose`: lo que hace después. hello (reposo), curious (inclina la cabeza), celebrate (salta de alegría),
 *   sleep (dormido: respira hondo y cabecea), think (la IA está respondiendo: ladea la cabeza).
 * - `play(act)`: un movimiento al tocarlo (saluda, salta, se ríe, ladea la cabeza, mueve la cola o se despierta).
 * En reposo respira, mira a los lados, mueve la cola, las orejas y parpadea. Con «reducir movimiento» (en Windows,
 * efectos de animación apagados) no salta, pero lo demás sí se mueve.
 */
@Component({
  selector: 'app-mascot',
  templateUrl: './mascot.component.html',
  styleUrls: ['./mascot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class MascotComponent implements OnDestroy {
  @Input() pose: MascotPose = 'hello';
  @Input() intro = false;
  /** Movimiento en curso por un toque (clase `act-*`). */
  act: MascotAct | null = null;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private cdr: ChangeDetectorRef) {}

  @HostBinding('class') get hostClass(): string {
    return `pose-${this.pose}${this.intro ? ' intro' : ''}${this.act ? ' act-' + this.act : ''}`;
  }

  /** Hace un movimiento. Si ya estaba en uno, lo corta y empieza el nuevo desde el principio. */
  play(act: MascotAct): void {
    clearTimeout(this.timer);
    this.act = null;
    this.cdr.detectChanges();
    // Un fotograma sin la clase para que la animación vuelva a empezar aunque se repita el mismo movimiento
    requestAnimationFrame(() => {
      this.act = act;
      this.cdr.detectChanges();
      this.timer = setTimeout(() => { this.act = null; this.cdr.markForCheck(); }, ACT_MS[act]);
    });
  }

  /** Vuelve a saludar con la pata. */
  greet(): void {
    this.play('wave');
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
