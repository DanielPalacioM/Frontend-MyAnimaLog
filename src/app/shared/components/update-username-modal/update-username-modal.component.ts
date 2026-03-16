import { Component, Input } from '@angular/core';
import { ModalController, LoadingController, AlertController } from '@ionic/angular';
import { ProfileService } from 'src/app/services/ProfileService/profile';

@Component({
  selector: 'app-update-username-modal',
  templateUrl: './update-username-modal.component.html',
  styleUrls: ['./update-username-modal.component.scss'],
  standalone: false
})
export class UpdateUsernameModalComponent {
  @Input() currentUsername: string = '';
  newUsername: string = '';

  constructor(
    private modalController: ModalController,
    private profileService: ProfileService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Inicializa con el username actual
    this.newUsername = this.currentUsername;
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  async saveUsername() {
    // Validaciones
    if (!this.newUsername || this.newUsername.trim() === '') {
      await this.showAlert('Error', 'Username cannot be empty');
      return;
    }

    if (this.newUsername === this.currentUsername) {
      await this.showAlert('Info', 'No changes detected');
      return;
    }

    if (this.newUsername.length < 3) {
      await this.showAlert('Error', 'Username must be at least 3 characters');
      return;
    }

    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Updating username...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    // Llamar al servicio
    this.profileService.updateProfile({ username: this.newUsername }).subscribe({
      next: async (response) => {
        await loading.dismiss();
        console.log('✅ Username actualizado:', response);
        
        // Cerrar modal y devolver el nuevo username
        await this.modalController.dismiss({
          updated: true,
          newUsername: this.newUsername
        });
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('❌ Error al actualizar username:', error);
        
        let errorMessage = 'Failed to update username. Please try again.';
        
        if (error.status === 409) {
          errorMessage = 'This username is already taken.';
        }
        
        await this.showAlert('Error', errorMessage);
      }
    });
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      cssClass: 'custom-alert',
      buttons: ['OK']
    });
    await alert.present();
  }
}