import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/authServices/auth';

@Component({
  selector: 'app-recover-password',
  templateUrl: './recover-password.page.html',
  styleUrls: ['./recover-password.page.scss'],
  standalone: false
})
export class RecoverPasswordPage implements OnInit {
  email: string = '';
  isFocused: boolean = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService  
  ) { }

  ngOnInit() {}

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }

  goHome() {
    this.router.navigate(['/login']);
  }

  async submitReset() {
    
    if (!this.email || this.email.trim() === '') {
      await this.showAlert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      await this.showAlert('Error', 'Please enter a valid email address');
      return;
    }

    
    const loading = await this.loadingController.create({
      message: 'Sending reset link...',
      spinner: 'crescent'
    });
    await loading.present();

    
    this.authService.requestPasswordReset(this.email).subscribe({
      next: async (response) => {
        await loading.dismiss();
        console.log('✅ Reset link sent:', response);
        
        await this.showAlert(
          'Success!', 
          'If an account exists with this email, you will receive a password reset link shortly.',
          true
        );
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('❌ Error sending reset email:', error);
        
        await this.showAlert(
          'Error', 
          'Failed to send reset link. Please try again.'
        );
      }
    });
  }

  async showAlert(header: string, message: string, navigateOnDismiss: boolean = false) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: [{
        text: 'OK',
        handler: () => {
          if (navigateOnDismiss) {
            this.router.navigate(['/login']);
          }
        }
      }]
    });
    await alert.present();
  }
}