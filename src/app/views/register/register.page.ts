import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/authServices/auth';
import { Router } from '@angular/router';
import { fullNameError, normalizeFullName, phoneError, userErrorMessage, USERNAME_RE } from 'src/app/shared/utils/user-identity.util';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  username: string = '';
  /** Opcionales: nombre para mostrar (con espacios y tildes) y teléfono. */
  fullName: string = '';
  phone: string = '';
  email: string = '';
  password: string = '';
  passwordVisible: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onRegister() {

  // Quitar espacios al inicio y final
  this.username = this.username.trim();
  this.email = this.email.trim();

  // Username
  if (!this.username) {
    alert('El nombre de usuario es obligatorio');
    return;
  }

  if (!USERNAME_RE.test(this.username)) {
    alert('El nombre de usuario debe tener de 3 a 50 caracteres: letras, números y guion bajo (_), sin espacios.');
    return;
  }

  // Nombre completo y teléfono (opcionales)
  this.fullName = normalizeFullName(this.fullName);
  const nameErr = fullNameError(this.fullName);
  if (nameErr) {
    alert(nameErr);
    return;
  }
  const phoneErr = phoneError(this.phone);
  if (phoneErr) {
    alert(phoneErr);
    return;
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(this.email)) {
    alert('Ingrese un correo electrónico válido');
    return;
  }

  // Password
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_\-])[A-Za-z\d@$!%*?&.#_\-]{8,}$/;

  if (!passwordRegex.test(this.password)) {
    alert(
      'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
    );
    return;
  }

  const userData: { username: string; email: string; password: string; fullName?: string; phone?: string } = {
    username: this.username,
    email: this.email,
    password: this.password
  };
  if (this.fullName) userData.fullName = this.fullName;
  if (this.phone.trim()) userData.phone = this.phone.trim();

  this.authService.register(userData).subscribe({
    next: (response) => {
      console.log('✅ Registro exitoso:', response);
      // El backend envía un PIN al correo: se confirma antes del primer login.
      this.router.navigate(['/verify-email'], { queryParams: { email: userData.email } });
    },
    error: (error) => {

      // El correo ya tiene cuenta. Puede que se haya registrado antes y no
      // alcanzó a poner el PIN: se le deja ir a verificar o al login.
      if (error.status === 409) {
        const goVerify = confirm(
          'Este correo ya está registrado.\n\n' +
          '¿Aún no has verificado tu cuenta? Pulsa "Aceptar" para ingresar el código que te enviamos.\n' +
          'Pulsa "Cancelar" para ir a iniciar sesión.'
        );
        if (goVerify) {
          this.router.navigate(['/verify-email'], { queryParams: { email: userData.email } });
        } else {
          this.router.navigate(['/login']);
        }
        return;
      }

      // Validación del backend: teléfono (INVALID_PHONE), nombre completo o username
      console.error('❌ Error registrando usuario:', error);
      alert(userErrorMessage(error, 'Ocurrió un error al registrar el usuario.'));
    }
  });
}

  goToLogin(){
    this.router.navigate(['/login'])
  }
}