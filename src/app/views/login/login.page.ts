import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  username: string = '';
  password: string = '';
  passwordVisible: boolean = false;

  constructor(private router: Router) {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onLogin() {
    if (this.username && this.password) {
      console.log('✅ Login data:', { user: this.username, pass: this.password });
      // aquí haces la navegación a la home o API call
    } else {
      console.log('⚠️ Debes ingresar usuario y contraseña');
    }
  }

  loginWithGoogle() {
    console.log('🌐 Google login clicked');
    // aquí llamas al servicio cuando lo tengas listo
  }

  // 🚀 Ir a registrar
  goToRegister() {
    this.router.navigate(['/register']);
  }

  GoToHome(){
    this.router.navigate(['/home'])
  }
}
