import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Visit } from 'src/app/models/medical-history.model';

/**
 * Selector de consulta asociada: botón que muestra la consulta elegida
 * y abre un modal con la lista de consultas como tarjetas.
 */
@Component({
  selector: 'app-visit-picker-field',
  templateUrl: './visit-picker-field.component.html',
  styleUrls: ['./visit-picker-field.component.scss'],
  standalone: false
})
export class VisitPickerFieldComponent {

  @Input() visits: Visit[] = [];
  @Input() value = '';

  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;

  get selected(): Visit | undefined {
    return this.visits.find(v => v.id === this.value);
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = (dateStr || '').slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return dateStr || '';
    return new Date(y, m - 1, d)
      .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  open(): void {
    if (this.visits.length) this.isOpen = true;
  }

  select(visit: Visit): void {
    this.value = visit.id;
    this.valueChange.emit(visit.id);
    this.isOpen = false;
  }
}
