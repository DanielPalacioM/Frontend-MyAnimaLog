import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from 'src/app/services/authServices/auth';
import { ProfileService } from 'src/app/services/ProfileService/profile';
import { UpdateUsernameModalComponent } from 'src/app/shared/components/update-username-modal/update-username-modal.component';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {

  username: string = 'Username';
  profileImage: string = '../../../assets/images/ProfileImage.png';

  constructor(
    public router: Router,
    private authService: AuthService,
    private profileService: ProfileService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadUserFromToken();
    this.loadProfileImageFromStorage();  // ✅ Cargar imagen al iniciar
  }

  loadUserFromToken() {
    const token = this.authService.getToken();
    
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        console.log('🔍 Token decodificado:', decoded);
        
        this.username = decoded.username || decoded.name || 'Username';
        
        console.log('👤 Username del token:', this.username);
      } catch (error) {
        console.error('❌ Error decodificando token:', error);
      }
    }
  }

  // ✅ Cargar imagen de localStorage (Google o upload)
  loadProfileImageFromStorage() {
    const savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
      this.profileImage = savedImage;
      console.log('🖼️ Imagen cargada desde localStorage:', savedImage);
    }
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (data) => {
        console.log('✅ Perfil cargado del backend:', data);
        
        if (data.username) {
          this.username = data.username;
        }
        
        if (data.profileImage) {
          this.profileImage = data.profileImage;
          localStorage.setItem('profileImage', data.profileImage);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar perfil del backend:', error);
      }
    });
  }

  onImageChange(file: File) {
    console.log('📸 Imagen seleccionada:', file);
    
    this.profileService.uploadProfileImage(file).subscribe({
      next: (response) => {
        console.log('✅ Imagen subida al backend:', response);
        if (response?.imageUrl) {
          this.profileImage = response.imageUrl;
          localStorage.setItem('profileImage', response.imageUrl);
        }
      },
      error: (error) => {
        console.error('❌ Error al subir imagen:', error);
      }
    });
  }

  onImageRemove() {
    console.log('🗑️ Eliminando imagen...');
    
    this.profileService.removeProfileImage().subscribe({
      next: (response) => {
        console.log('✅ Imagen eliminada del backend:', response);
        this.profileImage = '../../../assets/images/ProfileImage.png';
        localStorage.removeItem('profileImage');
      },
      error: (error) => {
        console.error('❌ Error al eliminar imagen del backend:', error);
        this.profileImage = '../../../assets/images/ProfileImage.png';
        localStorage.removeItem('profileImage');
      }
    });
  }

  async goToUpdateProfile() {
    const modal = await this.modalController.create({
      component: UpdateUsernameModalComponent,
      componentProps: {
        currentUsername: this.username
      },
      cssClass: 'transparent-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data?.updated) {
      console.log('✅ Username actualizado a:', data.newUsername);
      this.username = data.newUsername;
    }
  }

  goToMyPets() {
    this.router.navigate(['/my-pets']);
  }

  goToChangePassword() {
    this.router.navigate(['/change-password']);
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }

  onLogout() {
    console.log('🚪 Cerrando sesión...');
    
    this.authService.logout().subscribe({
      next: (response) => {
        console.log('✅ Logout exitoso:', response);
        this.authService.clearSession();
      },
      error: (error) => {
        console.error('❌ Error en logout:', error);
        this.authService.clearSession();
      }
    });
  }
}