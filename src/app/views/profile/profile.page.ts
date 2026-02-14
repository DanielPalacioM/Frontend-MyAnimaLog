import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/authServices/auth';
import { ProfileService } from 'src/app/services/ProfileService/profile';
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
    private profileService: ProfileService
  ) {}

  ngOnInit() {
    this.loadUserFromToken();  // ✅ Primero carga del token
    this.loadProfile();         // ✅ Luego carga del backend (si necesitas más datos)
  }

  // ✅ Cargar username desde el token (inmediato)
  loadUserFromToken() {
    const token = this.authService.getToken();
    
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        console.log('🔍 Token decodificado:', decoded);
        
        // ✅ Toma el username del token
        this.username = decoded.username || decoded.name || 'Username';
        
        console.log('👤 Username del token:', this.username);
      } catch (error) {
        console.error('❌ Error decodificando token:', error);
      }
    }
  }

  // ✅ Cargar perfil completo del backend (opcional, para más datos)
  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (data) => {
        console.log('✅ Perfil cargado del backend:', data);
        
        // Actualiza con datos del backend si están disponibles
        if (data.username) {
          this.username = data.username;
        }
        
        if (data.profileImage) {
          this.profileImage = data.profileImage;
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar perfil del backend:', error);
        // No es crítico, ya tenemos el username del token
      }
    });
  }

  onImageChange(file: File) {
    console.log('📸 Imagen seleccionada:', file);
    
    this.profileService.uploadProfileImage(file).subscribe({
      next: (response) => {
        console.log('✅ Imagen actualizada:', response);
        if (response.imageUrl) {
          this.profileImage = response.imageUrl;
        }
      },
      error: (error) => {
        console.error('❌ Error al subir imagen:', error);
      }
    });
  }

  goToUpdateProfile() {
    this.router.navigate(['/update-profile']);
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