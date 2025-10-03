import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/auth'; 
  // 👆 Cambia a la URL de Railway cuando lo montes

  constructor(private http: HttpClient) {}

  // Login con Google (tu backend debe manejar la lógica de OAuth)
  loginWithGoogle(): Observable<any> {
    return this.http.get(`${this.apiUrl}/google`);
  }

  // Login normal (usuario/contraseña, si más adelante lo quieres)
  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  // Cerrar sesión
  logout(): void {
    localStorage.removeItem('token');
  }

  // Guardar token en localStorage
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // Obtener token
  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
