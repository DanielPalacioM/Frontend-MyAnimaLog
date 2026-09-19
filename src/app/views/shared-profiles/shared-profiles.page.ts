import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shared-profiles',
  templateUrl: './shared-profiles.page.html',
  styleUrls: ['./shared-profiles.page.scss'],
  standalone: false
})
export class SharedProfilesPage implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    if (localStorage.getItem('sharedProfilesVisited') === 'true') {
      // El usuario ya pasó por aquí antes: saltamos esta pantalla
      // sin dejar rastro en el historial, para que el botón "atrás"
      // nunca vuelva a mostrarla.
      this.router.navigate(['/shared-profiles-home'], { replaceUrl: true });
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  onStartSharing() {
    localStorage.setItem('sharedProfilesVisited', 'true');
    // replaceUrl: true asegura que esta pantalla NO quede en el historial —
    // así, si el usuario luego presiona "atrás" desde shared-profiles-home,
    // salta directo a la pantalla anterior (Home), no vuelve aquí.
    this.router.navigate(['/shared-profiles-home'], { replaceUrl: true });
  }
}