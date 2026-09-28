import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/authServices/auth';

// Se abre desde el link del correo de "Recover your password".
// El token puede venir como /reset-password?token=... o /reset-password/<token>.
@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage {

  token = '';
  newPassword = '';
  confirmPassword = '';
  passwordVisible = false;
  saving = false;
  errorMessage = '';
  done = false;

  // Misma regla que en el registro.
  private readonly passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_\-])[A-Za-z\d@$!%*?&.#_\-]{8,}$/;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ionViewWillEnter() {
    const snapshot = this.route.snapshot;
    this.token = snapshot.queryParamMap.get('token')
      || snapshot.paramMap.get('token')
      || '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = this.token ? '' : 'El link no es válido o está incompleto. Solicita uno nuevo.';
    this.done = false;
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  submit() {
    this.errorMessage = '';

    if (!this.token) {
      this.errorMessage = 'El link no es válido o está incompleto. Solicita uno nuevo.';
      return;
    }
    if (!this.passwordRegex.test(this.newPassword)) {
      this.errorMessage = 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.saving = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.saving = false;
        this.done = true;
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Error restableciendo la contraseña:', err);
        this.errorMessage = err.status === 400 || err.status === 404 || err.status === 410
          ? 'El link ya expiró o ya fue usado. Solicita uno nuevo.'
          : (err.error?.message || 'No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  requestNewLink() {
    this.router.navigate(['/recover-password'], { replaceUrl: true });
  }
}
