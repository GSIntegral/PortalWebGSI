import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

/** Arma un JWT sin firma válida (el navegador solo decodifica el payload). */
function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ exp, ...claims })}.firma`;
}

const PORTAL_CLAIMS = {
  portal_user: 'true',
  userId: 'u-1',
  sub: 'u-1',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Ana Cliente',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'ana@cliente.com',
  Company: '7',
  CompanyName: 'Empresa Uno',
  ClientId: 'c-1',
  ClientCode: 'EMP001',
};

describe('AuthService (sesión del portal)', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let userService: UserService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    userService = TestBed.inject(UserService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('sessionKind', () => {
    it('es null sin token', () => {
      expect(service.sessionKind).toBeNull();
    });

    it("es 'client' cuando el token trae el claim portal_user", () => {
      service.accessToken = fakeJwt(PORTAL_CLAIMS);
      expect(service.sessionKind).toBe('client');
    });

    it("es 'staff' con un token de la plataforma", () => {
      service.accessToken = fakeJwt({ userId: 'u-9', is_super_admin: 'true' });
      expect(service.sessionKind).toBe('staff');
    });
  });

  describe('clientSignIn', () => {
    it('envía el correo y el SHA-256 al login del portal y arma la sesión del cliente', async () => {
      const token = fakeJwt(PORTAL_CLAIMS);

      const result$ = firstValueFrom(
        service.clientSignIn({ email: '  ana@cliente.com ', password: 'Secreta123' }),
      );

      // El hash se calcula con Web Crypto (asíncrono): espera a que salga la petición.
      const req = await vi.waitFor(() => {
        const found = http.match(`${environment.apiUrl}/api/PortalAuth/Login`);
        if (found.length === 0) throw new Error('aún no se envió la petición');
        return found[0];
      });

      expect(req.request.method).toBe('POST');
      expect(req.request.body.email).toBe('ana@cliente.com');
      expect(req.request.body.password).toMatch(/^[0-9a-f]{64}$/);
      expect(req.request.body.password).not.toBe('Secreta123');

      req.flush({
        success: true,
        message: 'ok',
        data: {
          token,
          requiresPasswordChange: false,
          user: {
            userId: 'u-1',
            fullName: 'Ana Cliente',
            email: 'ana@cliente.com',
            clientId: 'c-1',
            clientCode: 'EMP001',
            clientName: 'Empresa Uno',
          },
        },
      });

      expect(await result$).toEqual({ requiresPasswordChange: false });
      expect(service.accessToken).toBe(token);
      expect(userService.currentUser).toMatchObject({
        kind: 'client',
        clientCode: 'EMP001',
        clientName: 'Empresa Uno',
        isFirstLogin: false,
      });
    });

    it('marca el primer ingreso cuando el backend exige cambiar la contraseña', async () => {
      const result$ = firstValueFrom(service.clientSignIn({ email: 'ana@cliente.com', password: 'Temporal1!' }));

      const req = await vi.waitFor(() => {
        const found = http.match(`${environment.apiUrl}/api/PortalAuth/Login`);
        if (found.length === 0) throw new Error('aún no se envió la petición');
        return found[0];
      });
      req.flush({
        success: true,
        message: 'ok',
        data: {
          token: fakeJwt({ ...PORTAL_CLAIMS, first_login: 'true' }),
          requiresPasswordChange: true,
          user: { userId: 'u-1', fullName: 'Ana', email: 'ana@cliente.com', clientId: 'c-1', clientCode: 'EMP001', clientName: 'Empresa Uno' },
        },
      });

      expect((await result$).requiresPasswordChange).toBe(true);
      expect(userService.currentUser?.isFirstLogin).toBe(true);
    });
  });

  describe('signInUsingToken', () => {
    it('rehidrata al cliente desde los claims del token del portal', async () => {
      service.accessToken = fakeJwt({ ...PORTAL_CLAIMS, first_login: 'true' });

      await firstValueFrom(service.signInUsingToken());

      expect(userService.currentUser).toMatchObject({
        id: 'u-1',
        name: 'Ana Cliente',
        email: 'ana@cliente.com',
        kind: 'client',
        clientId: 'c-1',
        clientCode: 'EMP001',
        clientName: 'Empresa Uno',
        isFirstLogin: true,
        permissions: [],
      });
    });

    it("rehidrata como 'staff' un token de la plataforma", async () => {
      service.accessToken = fakeJwt({ userId: 'u-9', sub: 'u-9', Company: '1', permissions: '["SSTDCON"]' });

      await firstValueFrom(service.signInUsingToken());

      expect(userService.currentUser).toMatchObject({ kind: 'staff', permissions: ['SSTDCON'] });
    });
  });

  describe('changeFirstLoginPassword', () => {
    it('envía ambos valores como SHA-256 y guarda el token nuevo sin la marca de primer ingreso', async () => {
      service.accessToken = fakeJwt({ ...PORTAL_CLAIMS, first_login: 'true' });
      await firstValueFrom(service.signInUsingToken());
      const newToken = fakeJwt(PORTAL_CLAIMS);

      const done$ = firstValueFrom(service.changeFirstLoginPassword('Nueva1234', 'Nueva1234'));

      const req = await vi.waitFor(() => {
        const found = http.match(`${environment.apiUrl}/api/PortalAuth/ChangeFirstLoginPassword`);
        if (found.length === 0) throw new Error('aún no se envió la petición');
        return found[0];
      });
      expect(req.request.body.newPassword).toMatch(/^[0-9a-f]{64}$/);
      expect(req.request.body.newPassword).toBe(req.request.body.confirmPassword);
      req.flush({ success: true, message: 'ok', data: { token: newToken } });

      await done$;
      expect(service.accessToken).toBe(newToken);
      expect(userService.currentUser?.isFirstLogin).toBe(false);
    });
  });
});
