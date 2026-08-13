import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  standalone: false
})
export class AvatarComponent implements OnInit, OnChanges {
  @Input() imageUrl: string = 'assets/images/Profile/ImageUser.png';
  @Input() username: string = 'Username';
  @Input() editable: boolean = true;
  @Output() imageChange = new EventEmitter<File>();
  @Output() imageRemove = new EventEmitter<void>();  // ✅ Nuevo evento
  @Input() showUsername: boolean = true;
  @Input() size: number = 130;

  defaultImage: string = 'assets/images/Profile/ImageUser.png';
  hasCustomImage: boolean = false;

  constructor(private actionSheetController: ActionSheetController) {}

  ngOnInit() {

  this.hasCustomImage =
    !!this.imageUrl &&
    this.imageUrl !== this.defaultImage;

}

  ngOnChanges(changes: SimpleChanges): void {

  if (changes['imageUrl']) {

    this.hasCustomImage =
      !!this.imageUrl &&
      this.imageUrl !== this.defaultImage;

  }

}

  // ✅ Lógica al hacer clic en el avatar o en el icono de edición
  async onAvatarClick() {
    if (!this.editable) return;

    if (this.hasCustomImage) {
      // ✅ Si ya tiene imagen personalizada, muestra opciones
      await this.showImageOptions();
    } else {
      // ✅ Si no tiene imagen, va directo a galería
      this.triggerFileInput();
    }
  }

  // ✅ ActionSheet con opciones
  async showImageOptions() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Profile Photo',
      cssClass: 'custom-action-sheet',
      buttons: [
        {
          text: 'Edit photo',
          icon: 'camera-outline',
          handler: () => {
            this.triggerFileInput();
          }
        },
        {
          text: 'Remove photo',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.removeImage();
          }
        },
        {
          text: 'Cancel',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  // ✅ Eliminar imagen
  removeImage() {
    this.imageUrl = this.defaultImage;
    this.hasCustomImage = false;
    this.imageRemove.emit();
    console.log('🗑️ Imagen eliminada');
  }

  // ✅ Abrir selector de archivos
  triggerFileInput() {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  // ✅ Cuando se selecciona una imagen
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // ✅ Preview local inmediato
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result;
        this.hasCustomImage = true;
        
      };
      reader.readAsDataURL(file);

      // ✅ Emite el archivo para subirlo al backend
      this.imageChange.emit(file);
    }
  }
}