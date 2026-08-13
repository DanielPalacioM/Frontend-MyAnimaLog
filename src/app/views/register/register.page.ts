import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/authServices/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  username: string = '';
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
  const usernameRegex = /^[a-zA-Z0-9_]+$/;

  if (!this.username) {
    alert('El nombre de usuario es obligatorio');
    return;
  }

  if (!usernameRegex.test(this.username)) {
    alert('El nombre de usuario solo puede contener letras, números y guiones bajos (_)');
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

  const userData = {
    username: this.username,
    email: this.email,
    password: this.password
  };

  console.log('Datos a enviar:', userData);

  this.authService.register(userData).subscribe({
    next: (response) => {
      console.log('✅ Registro exitoso:', response);
      this.router.navigate(['/login']);
    },
    error: (error) => {

      // Si el backend devuelve errores de validación
      if (error.status === 400 && error.error?.errors) {
        const errors = Object.values(error.error.errors).join('\n');
        alert(errors);
        return;
      }

      console.error(error);
      alert('Ocurrió un error al registrar el usuario.');
    }
  });
}

  goToLogin(){
    this.router.navigate(['/login'])
  }
}