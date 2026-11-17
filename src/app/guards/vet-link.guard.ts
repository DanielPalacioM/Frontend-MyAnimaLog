import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authServices/auth';
import { extractVetCode } from '../shared/utils/vet.util';

export const PENDING_VET_CODE_KEY = 'pendingVetCode';

/** Devuelve el código de clínica que quedó pendiente antes de iniciar sesión (y lo olvida). */
export function takePendingVetCode(): string | null {
  const code = localStorage.getItem(PENDING_VET_CODE_KEY);
  localStorage.removeItem(PENDING_VET_CODE_KEY);
  return code ? extractVetCode(code) : null;
}

/** A dónde ir después de entrar: al vincular clínica si venía con un código, si no al Home. */
export function afterLoginUrl(router: Router) {
  const code = takePendingVetCode();
  return code ? router.createUrlTree(['/vet/link'], { queryParams: { code } }) : router.createUrlTree(['/home']);
}

/**
 * El enlace que la clínica manda al dueño (`/vet/link?code=VET-XXXXXXXX`) puede abrirse sin sesión o sin cuenta.
 * Se guarda el código, se manda al login (o al registro desde ahí) y, al entrar, el login lo retoma.
 */
export const vetLinkGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;

  const code = extractVetCode(route.queryParamMap.get('code') ?? '');
  if (code) localStorage.setItem(PENDING_VET_CODE_KEY, code);
  return router.createUrlTree(['/login']);
};
