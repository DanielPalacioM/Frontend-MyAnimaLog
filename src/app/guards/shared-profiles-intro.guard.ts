import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Clave por usuario: la pantalla de bienvenida de Perfiles compartidos
 * se muestra una sola vez por cuenta.
 */
export function sharedProfilesIntroKey(): string {
  return `sharedProfilesVisited_${localStorage.getItem('userId') || ''}`;
}

/**
 * Si el usuario ya vio la introducción, lo manda directo a shared-profiles-home
 * ANTES de renderizar la pantalla (sin parpadeo ni entrada extra en el historial).
 */
export const sharedProfilesIntroGuard: CanActivateFn = (route) => {
  const router = inject(Router);

  // 'sharedProfilesVisited' es la clave antigua (global): se respeta para
  // quienes ya la habían visto antes de que fuera por usuario.
  const alreadySeen =
    localStorage.getItem(sharedProfilesIntroKey()) === 'true' ||
    localStorage.getItem('sharedProfilesVisited') === 'true';

  if (alreadySeen) {
    return router.createUrlTree(['/shared-profiles-home'], {
      queryParams: route.queryParams
    });
  }

  return true;
};
