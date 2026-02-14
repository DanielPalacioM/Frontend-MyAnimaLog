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
    console.log('Register pressed');
    
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
      error: (error: any) => {  // ✅ Tipo agregado
        console.error('❌ Error en registro:', error);
      }
    });
  }

  goToLogin(){
    this.router.navigate(['/login'])
  }
}