import { Component, Input, Output, EventEmitter } from '@angular/core';

/** Foto de la mascota: círculo con insignia de cámara (registro) o fila compacta con "Cambiar foto" (edición). */
@Component({
  selector: 'app-step-photo',
  templateUrl: './step-photo.component.html',
  styleUrls: ['./step-photo.component.scss'],
  standalone: false
})
export class StepPhotoComponent {
  @Input() photo: string | null = null;
  @Input() editMode = false;
  @Output() photoChange = new EventEmitter<string | null>();
  /** Avisa al padre que debe borrar la foto en el backend. */
  @Output() photoRemoved = new EventEmitter<void>();

  /** Cámara (capture) o galería: las dos llegan como archivo. */
  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.photoChange.emit(reader.result as string);
    reader.readAsDataURL(file);
    input.value = '';
  }

  onRemovePhoto() {
    this.photoChange.emit(null);
    this.photoRemoved.emit();
  }
}
