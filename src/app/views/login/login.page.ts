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

  googleReady = false;
  googleLoading = false;

  // Respaldo: se muestra cuando Google no puede pintar el One Tap flotante
  // (por ejemplo, si el usuario lo cerró varias veces o el navegador lo bloquea).
  showGoogleFallback = false;

  private googleSubmitting = false;
  private lastGoogleIdToken: string | null = null;

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
    this.showGoogleFallback = false;

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
      cancel_on_tap_outside: true,
      // Requerido para que el selector flotante de cuentas (One Tap) siga
      // funcionando ahora que los navegadores bloquean cookies de terceros.
      use_fedcm_for_prompt: true
    });

    this.googleReady = true;

    console.log('✅ Google Identity inicializado');
  }

  // ✅ Botón "Gmail" del login: abre el selector flotante de cuentas de Google.
  onGoogleButtonClick() {
    if (!this.googleReady || !window.google?.accounts?.id) {
      console.warn('⏳ Google Identity todavía no está listo, intenta de nuevo en un momento.');
      return;
    }

    this.googleLoading = true;
    this.showGoogleFallback = false;

    window.google.accounts.id.prompt((notification: any) => {
      this.googleLoading = false;

      const notDisplayed = notification?.isNotDisplayed?.();
      const skipped = notification?.isSkippedMoment?.();

      if (notDisplayed || skipped) {
        const reason = notDisplayed
          ? notification.getNotDisplayedReason?.()
          : notification.getSkippedReason?.();

        console.warn('⚠️ Google One Tap no se pudo mostrar, se usa el botón de respaldo:', reason);
        this.openGoogleFallback();
      }
    });
  }

  // Pinta el botón oficial de Google dentro del panel flotante de respaldo.
  // Ese botón, al pulsarlo, abre el selector de cuentas de Google en una ventana propia.
  private openGoogleFallback() {
    this.showGoogleFallback = true;

    setTimeout(() => {
      const container = document.getElementById('googleButtonDiv');
      if (!container || !window.google?.accounts?.id) return;

      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 260
      });
    });
  }

  closeGoogleFallback() {
    this.showGoogleFallback = false;
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

    this.showGoogleFallback = false;

    const idToken = response?.credential;
    if (!idToken) {
      console.error('❌ No se recibió ID Token');
      return;
    }

    // Guarda contra doble disparo: en algunos navegadores (sobre todo con
    // FedCM activo) el callback de Google puede llegar dos veces para el
    // mismo credential, o el usuario puede alcanzar a tocar el botón de
    // respaldo mientras el primer intento sigue en curso. Sin esto, se
    // mandan dos POST casi seguidos a /auth/google y el segundo suele
    // toparse con el rate limit del gateway (que a veces responde sin
    // cabeceras CORS y Chrome lo muestra como "CORS error" en vez del
    // error real).
    if (this.googleSubmitting) {
      console.warn('⏳ Ya hay un login con Google en curso, se ignora este disparo.');
      return;
    }
    if (idToken === this.lastGoogleIdToken) {
      console.warn('⏳ Mismo credential de Google recibido de nuevo, se ignora.');
      return;
    }

    this.googleSubmitting = true;
    this.lastGoogleIdToken = idToken;

    console.log('✅ ID Token recibido');
    console.log(idToken);

    this.authservice.loginWithGoogle(idToken).subscribe({
      next: (res: any) => {
        this.googleSubmitting = false;
        console.log('✅ Login con Google exitoso', res);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.googleSubmitting = false;
        this.lastGoogleIdToken = null;
        console.error('❌ Error backend:', err);
        console.error('Respuesta:', err.error);
        alert('No fue posible iniciar sesión con Google. Intenta de nuevo.');
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