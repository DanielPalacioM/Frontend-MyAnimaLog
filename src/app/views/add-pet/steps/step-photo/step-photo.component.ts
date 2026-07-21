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
  @Output() photoChange = new EventEmitter<string>();

  onCameraClick() {
    console.log('abrir cámara');
  }

  onGalleryClick(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.photo = reader.result as string;
      this.photoChange.emit(this.photo);
    };
    reader.readAsDataURL(file);
  }
}