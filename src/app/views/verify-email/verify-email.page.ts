import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/authServices/auth';

// Paso 2 del registro: el backend manda un PIN de 6 dígitos al correo y aquí
// se confirma. Solo se pide la primera vez; después el login entra directo.
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: false
})
export class VerifyEmailPage {

  readonly codeLength = 6;
  digits: string[] = Array(this.codeLength).fill('');
  email = '';
  verifying = false;
  errorMessage = '';

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ionViewWillEnter() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.digits = Array(this.codeLength).fill('');
    this.errorMessage = '';
    if (!this.email) this.router.navigate(['/register']);
  }

  get code(): string {
    return this.digits.join('');
  }

  get isComplete(): boolean {
    return new RegExp(`^\\d{${this.codeLength}}$`).test(this.code);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onDigitInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    // Pegar el código completo en cualquier casilla.
    if (value.length > 1) {
      value.slice(0, this.codeLength).split('').forEach((d, i) => this.digits[i] = d);
      this.syncInputs();
      this.focus(Math.min(value.length, this.codeLength) - 1);
      if (this.isComplete) this.verify();
      return;
    }

    this.digits[index] = value;
    input.value = value;
    this.errorMessage = '';
    if (value && index < this.codeLength - 1) this.focus(index + 1);
    if (this.isComplete) this.verify();
  }

  onDigitKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.digits[index - 1] = '';
      this.syncInputs();
      this.focus(index - 1);
    }
  }

  verify() {
    if (!this.isComplete || this.verifying) return;
    this.verifying = true;
    this.errorMessage = '';

    this.authService.verifyEmail(this.email, this.code).subscribe({
      next: () => {
        this.verifying = false;
        alert('¡Correo verificado! Ya puedes iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.verifying = false;
        console.error('❌ Error verificando el código:', err);
        this.errorMessage = err.error?.message || 'El código no es válido o ya expiró.';
        this.digits = Array(this.codeLength).fill('');
        this.syncInputs();
        this.focus(0);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private syncInputs() {
    this.digitInputs?.forEach((ref, i) => ref.nativeElement.value = this.digits[i]);
  }

  private focus(index: number) {
    setTimeout(() => this.digitInputs?.get(index)?.nativeElement.focus());
  }
}
