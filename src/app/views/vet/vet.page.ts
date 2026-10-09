import { Component } from '@angular/core';
import { Router } from '@angular/router';

// Parte Vet del dueño. Por ahora solo el estado vacío de Figma ("VetAsosiation - empty"):
// todavía no hay clínicas vinculadas porque el backend de Veterinary no está conectado.
// "Empieza" lleva al mapa de veterinarias mientras llega el directorio de MyAnimaLogVet.
@Component({
  selector: 'app-vet',
  templateUrl: './vet.page.html',
  styleUrls: ['./vet.page.scss'],
  standalone: false
})
export class VetPage {

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/home']);
  }

  onStart() {
    this.router.navigate(['/maps']);
  }
}
