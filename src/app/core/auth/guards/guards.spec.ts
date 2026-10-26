import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { AuthGuard } from './auth.guard';
import { ClientGuard } from './client.guard';
import { StaffGuard } from './staff.guard';

function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ exp, ...claims })}.firma`;
}

const CLIENT_TOKEN = {
  portal_user: 'true',
  userId: 'u-1',
  Company: '7',
  CompanyName: 'Empresa Uno',
  ClientCode: 'EMP001',
};
const STAFF_TOKEN = { userId: 'u-9', Company: '1', permissions: '[]' };

describe('Guards del portal', () => {
  let router: Router;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  async function run(guard: typeof StaffGuard, url: string): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => guard(route, state(url)));
    const value = isObservable(result)
      ? await firstValueFrom(result as Observable<boolean | UrlTree>)
      : await Promise.resolve(result);
    return value as boolean | UrlTree;
  }

  describe('StaffGuard', () => {
    it('sin sesión envía al acceso interno conservando la URL pedida', async () => {
      const result = (await run(StaffGuard, '/portal-admin')) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/login/equipo?redirectURL=%2Fportal-admin');
    });

    it('un cliente del portal no puede entrar: vuelve a su tablero', async () => {
      auth.accessToken = fakeJwt(CLIENT_TOKEN);
      const result = (await run(StaffGuard, '/portal-admin')) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/sst-dashboard');
    });

    it('el equipo de GS Integral sí entra', async () => {
      auth.accessToken = fakeJwt(STAFF_TOKEN);
      expect(await run(StaffGuard, '/portal-admin')).toBe(true);
    });
  });

  describe('ClientGuard', () => {
    it('sin sesión envía al login de clientes', async () => {
      const result = (await run(ClientGuard, '/cambiar-contrasena')) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/login');
    });

    it('el equipo no tiene contraseña temporal del portal: va al tablero', async () => {
      auth.accessToken = fakeJwt(STAFF_TOKEN);
      const result = (await run(ClientGuard, '/cambiar-contrasena')) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/sst-dashboard');
    });

    it('un cliente entra', async () => {
      auth.accessToken = fakeJwt(CLIENT_TOKEN);
      expect(await run(ClientGuard, '/cambiar-contrasena')).toBe(true);
    });
  });

  describe('AuthGuard', () => {
    it('un cliente con contraseña temporal solo puede estar en el cambio de contraseña', async () => {
      auth.accessToken = fakeJwt({ ...CLIENT_TOKEN, first_login: 'true' });
      const result = (await run(AuthGuard as typeof StaffGuard, '/sst-dashboard')) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/cambiar-contrasena');
    });

    it('permite al cliente con contraseña temporal quedarse en el cambio de contraseña', async () => {
      auth.accessToken = fakeJwt({ ...CLIENT_TOKEN, first_login: 'true' });
      expect(await run(AuthGuard as typeof StaffGuard, '/cambiar-contrasena')).toBe(true);
    });

    it('un cliente sin pendientes accede al tablero', async () => {
      auth.accessToken = fakeJwt(CLIENT_TOKEN);
      expect(await run(AuthGuard as typeof StaffGuard, '/sst-dashboard')).toBe(true);
      expect(TestBed.inject(UserService).currentUser?.kind).toBe('client');
    });

    it('sin sesión redirige al login con la URL pedida', async () => {
      const result = (await run(AuthGuard as typeof StaffGuard, '/sst-dashboard')) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/login?redirectURL=%2Fsst-dashboard');
    });
  });
});
