import { Component, Input, OnInit } from '@angular/core';
import { ModalController, LoadingController, AlertController } from '@ionic/angular';
import { ProfileService } from 'src/app/services/ProfileService/profile';

@Component({
  selector: 'app-update-username-modal',
  templateUrl: './update-username-modal.component.html',
  styleUrls: ['./update-username-modal.component.scss'],
  standalone: false
})
export class UpdateUsernameModalComponent implements OnInit {

  @Input() currentUsername: string = '';
  @Input() profileImage: string = 'assets/images/Profile/ImageUser.png';

  newUsername: string = '';


  imageChanged: boolean = false;


  constructor(
    private modalController: ModalController,
    private profileService: ProfileService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.newUsername = this.currentUsername;
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  onImageChange(file: File) {

  this.imageChanged = true;
  // Vista previa inmediata
  const reader = new FileReader();
  reader.onload = (e: any) => {
    this.profileImage = e.target.result;
  };
  reader.readAsDataURL(file);
  // Subir inmediatamente al backend
  this.profileService.uploadProfileImage(file).subscribe({
    next: (response) => {
      if (response.imageUrl) {
        this.profileImage = response.imageUrl;
        localStorage.setItem(
          'profileImage',
          response.imageUrl
        );
      }
    },
    error: (err) => {
      console.error(err);
    }
  });
}


  onImageRemove() {

  this.imageChanged = true;
  this.profileService.removeProfileImage().subscribe({
    next: () => {
      this.profileImage =
        'assets/images/Profile/ImageUser.png';
      localStorage.removeItem('profileImage');
    },
    error: (err) => {
      console.error(err);
    }
  });

}

  async saveUsername() {

  const usernameChanged =
    this.newUsername.trim() !== this.currentUsername;

  // No hubo ningún cambio
  if (!usernameChanged && !this.imageChanged) {

    await this.showAlert(
      'Info',
      'No changes detected'
    );

    return;

  }

  // Validar username únicamente si cambió
  if (usernameChanged) {

    if (!this.newUsername.trim()) {

      await this.showAlert(
        'Error',
        'Username cannot be empty'
      );

      return;

    }

    if (this.newUsername.trim().length < 3) {

      await this.showAlert(
        'Error',
        'Username must be at least 3 characters'
      );

      return;

    }

  }

  const loading = await this.loadingController.create({
    message: 'Updating...',
    spinner: 'crescent'
  });

  await loading.present();

  try {

    // Actualizar username únicamente si cambió
    if (usernameChanged) {

      await this.profileService
        .updateProfile({
          username: this.newUsername.trim()
        })
        .toPromise();

    }

    await loading.dismiss();
    this.imageChanged = false;
    await this.modalController.dismiss({
      updated: true,
      newUsername: this.newUsername.trim(),
      profileImage: this.profileImage
    });
  } catch (error: any) {
    await loading.dismiss();
    let message = 'Failed to update profile';
    if (error.status === 409) {
      message = 'Username already exists';
    }
    await this.showAlert(
      'Error',
      message
    );
  }
}

  async showAlert(header: string, message: string) {

    const alert = await this.alertController.create({

      header,
      message,
      buttons: ['OK']

    });

    await alert.present();

  }

}