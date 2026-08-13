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

  email: string = '';
  password: string = '';
  passwordVisible: boolean = false;

  constructor(
    private router: Router,
    private authservice: AuthService
  ) {}

  ngAfterViewInit() {
    this.waitForGoogle();
  }

  // ✅ Se ejecuta cada vez que la página vuelve a mostrarse (Ionic)
  ionViewWillEnter() {
    this.email = '';
    this.password = '';

    const btnDiv = document.getElementById('googleButtonDiv');
    if (btnDiv) btnDiv.innerHTML = '';

    this.waitForGoogle();
  }

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
      callback: (response: any) => this.handleGoogleLogin(response),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    window.google.accounts.id.renderButton(
      document.getElementById('googleButtonDiv'),
      {
        type: 'icon',
        theme: 'outline',
        size: 'large',
        shape: 'circle'
      }
    );

    console.log('✅ Google Identity inicializado');
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onLogin() {
    this.email = this.email.trim();

    if (!this.email || !this.password) {
      alert('Por favor completa todos los campos.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      alert('Ingresa un correo electrónico válido.');
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
        console.error(err);
        switch (err.status) {
          case 400:
            alert('Verifica que el correo y la contraseña sean válidos.');
            break;
          case 401:
            alert('Correo o contraseña incorrectos.');
            break;
          case 403:
            alert('Tu cuenta no tiene permisos para iniciar sesión.');
            break;
          case 404:
            alert('No existe una cuenta asociada a ese correo.');
            break;
          case 500:
            alert('Ocurrió un error en el servidor. Intenta nuevamente.');
            break;
          default:
            if (err.error?.message) {
              alert(err.error.message);
            } else {
              alert('No fue posible iniciar sesión.');
            }
        }
      }
    });
  }

  handleGoogleLogin(response: any) {
    console.log('========================');
    console.log('RESPUESTA GOOGLE');
    console.log(response);
    console.log('credential:', response?.credential);
    console.log('========================');

    const idToken = response?.credential;
    if (!idToken) {
      console.error('❌ No se recibió ID Token');
      return;
    }
    console.log('✅ ID Token recibido');
    console.log(idToken);

    this.authservice.loginWithGoogle(idToken).subscribe({
      next: (res: any) => {
        console.log('✅ Login con Google exitoso', res);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('❌ Error backend:', err);
        console.error('Respuesta:', err.error);
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