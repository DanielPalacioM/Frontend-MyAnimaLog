import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../services/authServices/auth';
import { PENDING_VET_CODE_KEY, afterLoginUrl, takePendingVetCode, vetLinkGuard } from './vet-link.guard';

describe('vetLinkGuard', () => {
  let loggedIn = false;
  let router: Router;

  const run = (code: string | null) => {
    const route = { queryParamMap: convertToParamMap(code ? { code } : {}) } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => vetLinkGuard(route, {} as any));
  };

  beforeEach(() => {
    localStorage.removeItem(PENDING_VET_CODE_KEY);
    loggedIn = false;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } }],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.removeItem(PENDING_VET_CODE_KEY));

  it('con sesión deja pasar y no guarda nada', () => {
    loggedIn = true;
    expect(run('VET-7K2M9QXA')).toBeTrue();
    expect(localStorage.getItem(PENDING_VET_CODE_KEY)).toBeNull();
  });

  it('sin sesión guarda el código y manda al login', () => {
    const res = run('vet-7k2m9qxa') as UrlTree;
    expect(router.serializeUrl(res)).toBe('/login');
    expect(localStorage.getItem(PENDING_VET_CODE_KEY)).toBe('VET-7K2M9QXA');
  });

  it('sin sesión y sin código válido solo manda al login', () => {
    run('cualquier-cosa');
    expect(localStorage.getItem(PENDING_VET_CODE_KEY)).toBeNull();
  });

  it('takePendingVetCode devuelve el código una sola vez', () => {
    localStorage.setItem(PENDING_VET_CODE_KEY, 'VET-7K2M9QXA');
    expect(takePendingVetCode()).toBe('VET-7K2M9QXA');
    expect(takePendingVetCode()).toBeNull();
  });

  it('afterLoginUrl: con código pendiente va a vincular; sin él, al Home', () => {
    localStorage.setItem(PENDING_VET_CODE_KEY, 'VET-7K2M9QXA');
    expect(router.serializeUrl(afterLoginUrl(router))).toBe('/vet/link?code=VET-7K2M9QXA');
    expect(router.serializeUrl(afterLoginUrl(router))).toBe('/home');
  });
});
