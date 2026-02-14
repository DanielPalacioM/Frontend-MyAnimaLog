import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/authServices/auth';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements AfterViewInit {

  email: string = '';  // ✅ Cambiado de username a email
  password: string = '';
  passwordVisible: boolean = false;

  constructor(
    private router: Router,
    private authservice: AuthService
  ) {}

  ngAfterViewInit() {
    this.waitForGoogle();
  }

  // 🔥 Espera a que el SDK cargue correctamente
  waitForGoogle() {
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        this.initializeGoogle();
      }
    }, 100);
  }

  initializeGoogle() {
    window.google.accounts.id.initialize({
      client_id: '197571675834-sf7vdbok5ubm1qk63gfgp31mvn8srhen.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogleLogin(response)
    });

    console.log('✅ Google inicializado correctamente');
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onLogin() {
  if (!this.email || !this.password) {
    console.log('⚠️ Por favor completa todos los campos');
    return;
  }

  console.log('📤 Enviando login:', { email: this.email });

  
  this.authservice.login({
    email: this.email,
    password: this.password
  }).subscribe({
    next: () => {
      console.log('✅ Login exitoso');
      this.router.navigate(['/home']);
    },
    error: (err: any) => {
      console.error('❌ Credenciales inválidas', err);
    }
  });
}

  loginWithGoogle() {
    if (!window.google?.accounts?.id) {
      console.error('❌ Google SDK no cargado');
      return;
    }

    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        console.warn('⚠️ Prompt no mostrado:', notification.getNotDisplayedReason());
      }
      if (notification.isSkippedMoment()) {
        console.warn('⚠️ Prompt omitido:', notification.getSkippedReason());
      }
    });
  }

  handleGoogleLogin(response: any) {
    const idToken = response?.credential;

    if (!idToken) {
      console.error('❌ No se recibió idToken');
      return;
    }

    console.log('✅ Token recibido, enviando al backend...');

    this.authservice.loginWithGoogle(idToken).subscribe({
      next: (res: any) => {
        console.log('✅ Login exitoso');
        this.authservice.saveToken(res.token);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('❌ Error en backend:', err);
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  GoToRecoverPassword() {
    this.router.navigate(['/recover-password']);
  }
}