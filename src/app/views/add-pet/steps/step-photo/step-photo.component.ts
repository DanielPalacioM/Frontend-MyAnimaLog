import { Component, Input, Output, EventEmitter } from '@angular/core';

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
  @Output() photoRemoved = new EventEmitter<void>(); // 👈 nuevo: avisa al padre que debe borrar la foto en el backend

  onCameraClick() {
    console.log('abrir cámara');
  }

  onGalleryClick(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoChange.emit(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  onRemovePhoto() {
    this.photoChange.emit(null);
    this.photoRemoved.emit(); // el padre decide si debe llamar al backend
  }

  onSkip() {
    this.photoChange.emit(null);
  }
}