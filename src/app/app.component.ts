import { Component } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';

/** Tiempo mínimo de la pantalla de carga: lo que tarda el perrito en entrar y agitar la pata 3 veces. */
export const SPLASH_MIN_MS = 1700;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(router: Router) {
    // La pantalla de carga (src/index.html) se va cuando ya hay una pantalla abierta, sin cortar el saludo
    router.events.pipe(
      filter(e => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      take(1)
    ).subscribe(() => hideSplash());
  }
}

export function hideSplash(doc: Document = document, now: number = performance.now()): void {
  const el = doc.getElementById('boot-splash');
  if (!el) return;
  setTimeout(() => {
    el.classList.add('gone');
    setTimeout(() => el.remove(), 400);
  }, Math.max(0, SPLASH_MIN_MS - now));
}
