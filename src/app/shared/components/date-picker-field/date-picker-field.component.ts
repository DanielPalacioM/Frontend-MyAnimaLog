import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Selector de fecha con el mismo formato visual que el de "Agregar evento":
 * botón con icono + fecha legible que abre un ion-datetime en un modal.
 * value usa formato YYYY-MM-DD (igual que el input type="date").
 */
@Component({
  selector: 'app-date-picker-field',
  templateUrl: './date-picker-field.component.html',
  styleUrls: ['./date-picker-field.component.scss'],
  standalone: false
})
export class DatePickerFieldComponent {

  @Input() value = '';
  @Input() placeholder = 'Fecha';
  @Input() min?: string;
  @Input() max?: string;

  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;

  get pickerValue(): string {
    return this.value || new Date().toISOString().slice(0, 10);
  }

  get display(): string {
    if (!this.value) return this.placeholder;
    const [y, m, d] = this.value.split('-').map(Number);
    if (!y || !m || !d) return this.placeholder;
    return new Date(y, m - 1, d)
      .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  open(): void {
    this.isOpen = true;
  }

  onConfirm(value: string | string[] | null | undefined): void {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) {
      this.value = raw.slice(0, 10);
      this.valueChange.emit(this.value);
    }
    this.isOpen = false;
  }
}
