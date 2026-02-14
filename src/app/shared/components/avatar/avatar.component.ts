import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  standalone : false
})
export class AvatarComponent {
  @Input() imageUrl: string = '../../../assets/images/ProfileImage.png';  
  @Input() username: string = 'Username';
  @Input() editable: boolean = true;
  @Output() imageChange = new EventEmitter<File>();

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageChange.emit(file);
      
      // Preview local de la imagen
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput() {
    if (this.editable) {
      const input = document.getElementById('fileInput') as HTMLInputElement;
      if (input) {
        input.click();
      }
    }
  }
}