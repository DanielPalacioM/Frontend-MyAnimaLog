import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { sharedProfilesIntroKey } from 'src/app/guards/shared-profiles-intro.guard';

@Component({
  selector: 'app-shared-profiles',
  templateUrl: './shared-profiles.page.html',
  styleUrls: ['./shared-profiles.page.scss'],
  standalone: false
})
export class SharedProfilesPage implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    // Esta pantalla solo se muestra la primera vez. Se marca como vista al
    // entrar (no solo al pulsar el botón) para que nunca vuelva a aparecer;
    // el guard de la ruta se encarga de saltarla desde ahora.
    localStorage.setItem(sharedProfilesIntroKey(), 'true');
  }

  goBack() {
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  onStartSharing() {
    // replaceUrl: la introducción no queda en el historial, así "atrás"
    // desde shared-profiles-home no vuelve aquí.
    this.router.navigate(['/shared-profiles-home'], { replaceUrl: true });
  }
}
