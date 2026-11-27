import { Component, Input, OnInit } from '@angular/core';
import { ModalController, LoadingController, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import { fullNameError, normalizeFullName, phoneError, userErrorMessage, USERNAME_RE } from 'src/app/shared/utils/user-identity.util';

/**
 * Editar perfil: foto, nombre completo, nombre de usuario y teléfono (PUT /user/{id}).
 * El username va siempre (el backend lo exige); nombre y teléfono solo si cambiaron:
 * omitidos no se tocan y vacíos ("") se borran.
 */
@Component({
  selector: 'app-update-username-modal',
  templateUrl: './update-username-modal.component.html',
  styleUrls: ['./update-username-modal.component.scss'],
  standalone: false
})
export class UpdateUsernameModalComponent implements OnInit {

  @Input() currentUsername: string = '';
  @Input() currentFullName: string = '';
  @Input() currentPhone: string = '';
  @Input() profileImage: string = 'assets/images/Profile/ImageUser.png';

  newUsername: string = '';
  newFullName: string = '';
  newPhone: string = '';

  imageChanged: boolean = false;

  constructor(
    private modalController: ModalController,
    private profileService: ProfileService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.newUsername = this.currentUsername;
    // Si no tiene nombre guardado el backend devuelve el username: no lo mostramos como nombre.
    this.newFullName = this.currentFullName && this.currentFullName !== this.currentUsername ? this.currentFullName : '';
    this.newPhone = this.currentPhone || '';
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
          localStorage.setItem('profileImage', response.imageUrl);
        }
      },
      error: (err) => console.error('❌ Error subiendo la foto:', err)
    });
  }

  onImageRemove() {
    this.imageChanged = true;
    this.profileService.removeProfileImage().subscribe({
      next: () => {
        this.profileImage = 'assets/images/Profile/ImageUser.png';
        localStorage.removeItem('profileImage');
      },
      error: (err) => console.error('❌ Error quitando la foto:', err)
    });
  }

  /** Lo que se manda en el PUT, o null si no cambió nada de texto. */
  buildUpdate(): { username: string; fullName?: string; phone?: string } | null {
    const username = this.newUsername.trim();
    const fullName = normalizeFullName(this.newFullName);
    const phone = this.newPhone.trim();
    const initialName = this.currentFullName && this.currentFullName !== this.currentUsername ? this.currentFullName : '';
    const body: { username: string; fullName?: string; phone?: string } = { username };
    if (fullName !== normalizeFullName(initialName)) body.fullName = fullName;
    if (phone !== (this.currentPhone || '').trim()) body.phone = phone;
    const changed = username !== this.currentUsername || 'fullName' in body || 'phone' in body;
    return changed ? body : null;
  }

  async saveUsername() {
    const body = this.buildUpdate();

    if (!body && !this.imageChanged) {
      await this.showAlert('Sin cambios', 'No hay nada nuevo para guardar.');
      return;
    }

    if (body) {
      if (!USERNAME_RE.test(body.username)) {
        await this.showAlert('Revisa el usuario', 'El nombre de usuario debe tener de 3 a 50 caracteres: letras, números y guion bajo (_), sin espacios.');
        return;
      }
      const err = fullNameError(body.fullName) || phoneError(body.phone);
      if (err) {
        await this.showAlert('Revisa los datos', err);
        return;
      }
    }

    const loading = await this.loadingController.create({ message: 'Guardando…', spinner: 'crescent' });
    await loading.present();

    try {
      if (body) await firstValueFrom(this.profileService.updateProfile(body));
      await loading.dismiss();
      this.imageChanged = false;
      await this.modalController.dismiss({
        updated: true,
        newUsername: this.newUsername.trim(),
        profileImage: this.profileImage
      });
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error actualizando el perfil:', error);
      await this.showAlert('No se pudo guardar', userErrorMessage(error, 'No se pudo actualizar el perfil.'));
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }
}
