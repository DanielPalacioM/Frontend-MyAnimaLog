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
  email: string = '';
  profileImage: string = 'assets/images/Profile/ImageUser.png';;
  showLanguage: boolean = false;
  selectedLanguage: string = 'en';
  showThemeConfirm: boolean = false;
  currentTheme: string = 'light';

  constructor(
    public router: Router,
    private authService: AuthService,
    private profileService: ProfileService,
    private modalController: ModalController
  ) {}

  ngOnInit() {

  this.selectedLanguage = localStorage.getItem('language') || 'en';
  this.currentTheme = localStorage.getItem('theme') || 'light';
}

 ionViewWillEnter() {
    this.loadProfile();
  }


  loadUserFromToken() {
    const token = this.authService.getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.username = decoded.username || decoded.name || 'Username';
        this.email = decoded.email || '';
      } catch (error) {
        console.error('❌ Error decodificando token:', error);
      }
    }
  }

  loadProfileImageFromStorage() {
    const savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
      this.profileImage = savedImage;
    }
  }

  loadProfile() {
  this.profileService.getProfile().subscribe({
    next: (profile) => {

      console.log("✅ Perfil recibido:", profile);

      this.username = profile.username;
      this.email = profile.email;

      console.log("USERNAME COMPONENT:", this.username);
      console.log("EMAIL COMPONENT:", this.email);

     if (profile.profileImageUrl) {
  this.profileImage = profile.profileImageUrl;
  localStorage.setItem('profileImage', profile.profileImageUrl);
} else {
  this.profileImage = 'assets/images/Profile/ImageUser.png';
}

    },

    error: (err) => {
      console.error("❌ Error obteniendo perfil", err);
    }
  });
}

  onImageChange(file: File) {
    this.profileService.uploadProfileImage(file).subscribe({
      next: (response) => {
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
    this.profileService.removeProfileImage().subscribe({
      next: () => {
        this.profileImage = 'assets/images/Profile/ImageUser.png';;
        localStorage.removeItem('profileImage');
      },
      error: () => {
        this.profileImage = 'assets/images/Profile/ImageUser.png';;
        localStorage.removeItem('profileImage');
      }
    });
  }

  async goToUpdateProfile() {
  const modal = await this.modalController.create({
    component: UpdateUsernameModalComponent,
    componentProps: {
      currentUsername: this.username,
      profileImage: this.profileImage
    },
    cssClass: 'transparent-modal'
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();

  if (data?.updated) {
    this.username = data.newUsername;
    this.profileImage = data.profileImage;
    this.loadProfile();
  }
}

  // language
  goToLanguage()  { this.showLanguage = true; }
  closeLanguage() { this.showLanguage = false; }
  selectLanguage(lang: string) {
    this.selectedLanguage = lang;
    localStorage.setItem('language', lang);
    setTimeout(() => this.closeLanguage(), 300);
  }

  // theme
  goToTheme()   { this.showThemeConfirm = true; }
  cancelTheme() { this.showThemeConfirm = false; }
  confirmTheme(newTheme: string) {
    this.currentTheme = newTheme;
    localStorage.setItem('theme', this.currentTheme);
    document.body.setAttribute('data-theme', this.currentTheme);
    this.showThemeConfirm = false;
  }

  // navegacion activa
  goToSharedProfiles() { this.router.navigate(['/shared-profiles']); }
  goToNotifications()  { this.router.navigate(['/notifications']); }
  goToAboutUs()        { this.router.navigate(['/about-us']); }
  goToSocialMedia()    { this.router.navigate(['/social-media']); }
  goToMyPets()         { this.router.navigate(['/my-pets']); }

  // inactivos por ahora
  goToHelpCenter()     {}
  goToBugsReport()     {}
  goToFeedback()       {}
  goToSettings()       {}
  goToChangePassword() {}

  onLogout() {
    this.authService.logout().subscribe({
      next: () => { this.authService.clearSession(); },
      error: () => { this.authService.clearSession(); }
    });
  }
}