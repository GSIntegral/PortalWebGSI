import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    catchError,
    forkJoin,
    from,
    map,
    Observable,
    of,
    switchMap,
    throwError,
    timeout,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionKind } from '../user/user.types';
import { UserService } from '../user/user.service';
import { AuthUtils } from './auth.utils';

/** Respuesta de `POST /api/PortalAuth/Login` (dentro del envelope `data`). */
interface PortalLoginData {
    token: string;
    requiresPasswordChange: boolean;
    user: {
        userId: string;
        fullName: string;
        email: string;
        clientId: string;
        clientCode: string;
        clientName: string;
    };
}

interface ApiEnvelope<T> {
    data: T;
    success: boolean;
    message: string;
}

/** Lee el primer claim presente, soportando tanto los nombres cortos como las URIs WS-Federation. */
function readClaim(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = payload[key];
        if (value !== undefined && value !== null && value !== '') {
            return String(value);
        }
    }
    return undefined;
}

const CLAIM_EMAIL = [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    'email',
];
const CLAIM_NAME = [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    'unique_name',
    'name',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _authenticated: boolean = false;
    private _httpClient = inject(HttpClient);
    private _userService = inject(UserService);
    private _platformId = inject(PLATFORM_ID);
    private _isBrowser = isPlatformBrowser(this._platformId);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for access token
     */
    set accessToken(token: string) {
        if (this._isBrowser) {
            localStorage.setItem('accessToken', token);
        }
    }

    get accessToken(): string {
        if (!this._isBrowser) {
            return '';
        }
        return localStorage.getItem('accessToken') ?? '';
    }

    /**
     * Tipo de sesión según el token guardado: los tokens del portal (clientes) llevan el claim
     * `portal_user`. Es solo para decidir qué pantallas mostrar; la autorización real la impone
     * el backend (un token del portal no valida en la plataforma ni al revés).
     */
    get sessionKind(): SessionKind | null {
        const token = this.accessToken;
        if (!token) {
            return null;
        }
        const payload = AuthUtils.decodeToken(token);
        if (!payload) {
            return null;
        }
        const flag = payload['portal_user'];
        return flag === true || flag === 'true' ? 'client' : 'staff';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Forgot password
     *
     * @param email
     */
    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post(
            `${environment.apiUrl}/api/auth/forgot-password`,
            email
        );
    }

    /**
     * Reset password
     *
     * @param password
     */
    resetPassword(password: string): Observable<any> {
        return this._httpClient.post(
            `${environment.apiUrl}/api/auth/reset-password`,
            password
        );
    }

    /**
     * Inicio de sesión del CLIENTE del portal (HU_079): login independiente, otra tabla y otro
     * token que el de la plataforma Facil ISO (`POST /api/PortalAuth/Login`).
     *
     * Envía SHA-256 de la contraseña (igual que el login de la plataforma) con un timeout de 10 s.
     */
    clientSignIn(credentials: {
        email: string;
        password: string;
    }): Observable<{ requiresPasswordChange: boolean }> {
        if (this._authenticated) {
            return throwError(() => 'User is already logged in.');
        }

        return from(this._sha256Hex(credentials.password)).pipe(
            switchMap((hash) =>
                this._httpClient
                    .post<ApiEnvelope<PortalLoginData>>(
                        `${environment.apiUrl}/api/PortalAuth/Login`,
                        { email: credentials.email.trim(), password: hash }
                    )
                    .pipe(timeout(10000))
            ),
            map((response) => {
                const data = response.data;
                this.accessToken = data.token;
                this._authenticated = true;

                this._userService.user = {
                    id: data.user.userId,
                    name: data.user.fullName,
                    email: data.user.email,
                    role: 'PortalClient',
                    roles: ['PortalClient'],
                    isFirstLogin: data.requiresPasswordChange,
                    requiresPasswordChange: data.requiresPasswordChange,
                    companyName: data.user.clientName,
                    kind: 'client',
                    clientId: data.user.clientId,
                    clientCode: data.user.clientCode,
                    clientName: data.user.clientName,
                    permissions: [],
                };

                // El logo de la empresa llega con el tablero (no está en el JWT ni en el login).
                if (this._isBrowser) {
                    localStorage.removeItem('companyLogo');
                }

                return { requiresPasswordChange: data.requiresPasswordChange };
            })
        );
    }

    /**
     * Cambia la contraseña temporal del primer ingreso del cliente
     * (`POST /api/PortalAuth/ChangeFirstLoginPassword`) y rehidrata la sesión con el token nuevo,
     * que ya no lleva la marca de primer ingreso.
     */
    changeFirstLoginPassword(
        newPassword: string,
        confirmPassword: string
    ): Observable<void> {
        return forkJoin([
            from(this._sha256Hex(newPassword)),
            from(this._sha256Hex(confirmPassword)),
        ]).pipe(
            switchMap(([newHash, confirmHash]) =>
                this._httpClient.post<ApiEnvelope<{ token: string }>>(
                    `${environment.apiUrl}/api/PortalAuth/ChangeFirstLoginPassword`,
                    { newPassword: newHash, confirmPassword: confirmHash }
                )
            ),
            switchMap((response) => {
                this.accessToken = response.data.token;
                return this.signInUsingToken();
            }),
            map(() => undefined)
        );
    }

    /**
     * Inicio de sesión del EQUIPO de GS Integral con las credenciales de la plataforma Facil ISO
     * (HU_001). Es el acceso para administrar el portal (empresas, usuarios, editor de datos).
     *
     * Hashes the password with SHA-256 (Web Crypto API) before sending,
     * then POSTs to /api/Auth/Login. Decodes the returned JWT to build
     * the User object from claims. Applies a 10-second network timeout.
     *
     * @param credentials
     */
    staffSignIn(credentials: { email: string; password: string }): Observable<any> {
        if (this._authenticated) {
            return throwError(() => 'User is already logged in.');
        }

        return from(this._sha256Hex(credentials.password)).pipe(
            switchMap((hash) =>
                this._httpClient
                    .post(`${environment.apiUrl}/api/Auth/Login`, {
                        email: credentials.email,
                        password: hash,
                    })
                    .pipe(timeout(10000))
            ),
            switchMap((response: any) => {
                const token: string = response.data.token;
                const requiresPasswordChange: boolean =
                    response.data.requiresPasswordChange ?? false;
                const apiUser = response.data.user ?? {};

                this.accessToken = token;
                this._authenticated = true;

                const claims = AuthUtils.decodeToken(token) ?? {};
                const role: string | undefined =
                    apiUser.profileName ?? claims['role'] ?? undefined;
                const isSuperAdmin =
                    claims['is_super_admin'] === true ||
                    claims['is_super_admin'] === 'true';

                const permissionsRaw =
                    claims['permissions'] ?? apiUser.permissions ?? null;
                let permissions: string[] = [];
                try {
                    if (typeof permissionsRaw === 'string') {
                        permissions = JSON.parse(permissionsRaw);
                    } else if (Array.isArray(permissionsRaw)) {
                        permissions = permissionsRaw;
                    }
                } catch {
                    /* noop */
                }

                this._userService.user = {
                    id: apiUser.userId ?? claims['sub'] ?? '',
                    name:
                        apiUser.fullName ??
                        claims['unique_name'] ??
                        claims['name'] ??
                        '',
                    email: apiUser.email ?? claims['email'] ?? '',
                    companyId: apiUser.companyId ?? null,
                    profileId: apiUser.profileId,
                    profileName: role,
                    role,
                    roles: role ? [role] : [],
                    isActive: apiUser.status,
                    isFirstLogin:
                        apiUser.isFirstLogin ??
                        (claims['first_login'] === true ||
                            claims['first_login'] === 'true'),
                    failedAttempts: apiUser.failedAttempts,
                    isLocked: apiUser.isLocked,
                    requiresPasswordChange,
                    isSuperAdmin,
                    companyName: apiUser.companyName ?? undefined,
                    companyLogo: apiUser.companyLogo ?? null,
                    permissions,
                    kind: 'staff',
                };

                // Persistir logo entre recargas (no está en el JWT)
                if (this._isBrowser) {
                    if (apiUser.companyLogo) {
                        localStorage.setItem('companyLogo', apiUser.companyLogo);
                    } else {
                        localStorage.removeItem('companyLogo');
                    }
                }

                return of({ requiresPasswordChange, isSuperAdmin });
            })
        );
    }

    /**
     * Empresas activas disponibles para el flujo de selección del superadmin (HU_002).
     * El endpoint está exento del filtro de empresa (AllowWithoutCompany).
     */
    getActiveCompanies(): Observable<
        Array<{ companyId: number; name: string; logo?: string | null }>
    > {
        return this._httpClient
            .get<any>(`${environment.apiUrl}/api/Auth/GetActiveCompanies`)
            .pipe(map((response) => response?.data ?? []));
    }

    /**
     * Selecciona la empresa del superadmin: el backend reemite el token con el
     * claim Company y aquí se re-hidrata el usuario con ese token.
     */
    selectCompany(companyId: number): Observable<boolean> {
        return this._httpClient
            .post<any>(`${environment.apiUrl}/api/Auth/SelectCompany`, { companyId })
            .pipe(
                switchMap((response) => {
                    const token: string | undefined = response?.data?.accessToken;
                    if (!token) {
                        return of(false);
                    }
                    this.accessToken = token;
                    this._authenticated = true;
                    return this.signInUsingToken();
                })
            );
    }

    /**
     * Sign in using the access token
     */
    signInUsingToken(): Observable<any> {
        const payload = AuthUtils.decodeToken(this.accessToken);

        // Token de un usuario del portal (cliente): se rehidrata desde sus claims propios.
        if (
            payload &&
            (payload['portal_user'] === true || payload['portal_user'] === 'true')
        ) {
            const firstLogin =
                payload['first_login'] === true ||
                payload['first_login'] === 'true';
            const clientName =
                readClaim(payload, 'CompanyName') ?? undefined;

            this._userService.user = {
                id: readClaim(payload, 'userId', 'sub') ?? '',
                name: readClaim(payload, ...CLAIM_NAME) ?? '',
                email: readClaim(payload, ...CLAIM_EMAIL) ?? '',
                role: 'PortalClient',
                roles: ['PortalClient'],
                isFirstLogin: firstLogin,
                requiresPasswordChange: firstLogin,
                companyName: clientName,
                kind: 'client',
                clientId: readClaim(payload, 'ClientId'),
                clientCode: readClaim(payload, 'ClientCode'),
                clientName,
                permissions: [],
            };
            this._authenticated = true;
            return of(true);
        }

        if (payload) {
            // Soporta claims simples (spec HU_002) y WS-Federation namespaced (backend actual)
            const role =
                payload[
                    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
                ] ??
                payload[
                    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'
                ] ??
                payload['role'] ??
                null;

            const name =
                payload[
                    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
                ] ??
                payload['name'] ??
                '';

            const email =
                payload[
                    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
                ] ??
                payload['email'] ??
                '';

            const permissionsRaw = payload['permissions'] ?? null;
            let permissions: string[] = [];
            try {
                if (typeof permissionsRaw === 'string') {
                    permissions = JSON.parse(permissionsRaw);
                } else if (Array.isArray(permissionsRaw)) {
                    permissions = permissionsRaw;
                }
            } catch {
                /* noop */
            }

            this._userService.user = {
                id: payload['sub'],
                name,
                email,
                profileId: payload['roleId'] ?? null,
                profileName: role,
                role: role,
                roles: role ? [role] : [],
                companyId: payload['Company'] ? Number(payload['Company']) : null,
                isFirstLogin: payload['first_login'] === 'true',
                isSuperAdmin:
                    payload['is_super_admin'] === true ||
                    payload['is_super_admin'] === 'true',
                companyName: payload['CompanyName'] ?? undefined,
                companyLogo: this._isBrowser
                    ? localStorage.getItem('companyLogo')
                    : null,
                permissions,
                kind: 'staff',
            };
            this._authenticated = true;
            return of(true);
        }

        return this._httpClient
            .post(`${environment.apiUrl}/api/auth/sign-in-with-token`, {
                accessToken: this.accessToken,
            })
            .pipe(
                catchError(() => of(false)),
                switchMap((response: any) => {
                    if (response.accessToken) {
                        this.accessToken = response.accessToken;
                    }

                    this._authenticated = true;
                    this._userService.user = response.user;

                    return of(true);
                })
            );
    }

    /**
     * Sign out
     */
    signOut(): Observable<any> {
        if (this._isBrowser) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('companyLogo');
        }
        this._authenticated = false;
        return of(true);
    }

    /**
     * Delegates token expiration check to AuthUtils (used by interceptors).
     */
    isTokenExpired(token: string): boolean {
        return AuthUtils.isTokenExpired(token);
    }

    /**
     * Clears session and reloads the page (used by interceptors on expired token).
     */
    onLogOut(): void {
        this.signOut().subscribe();
        if (this._isBrowser) {
            location.reload();
        }
    }

    /**
     * Sign up
     *
     * @param user
     */
    signUp(user: {
        name: string;
        email: string;
        password: string;
        company: string;
    }): Observable<any> {
        return this._httpClient.post(
            `${environment.apiUrl}/api/auth/sign-up`,
            user
        );
    }

    /**
     * Unlock session
     *
     * @param credentials
     */
    unlockSession(credentials: {
        email: string;
        password: string;
    }): Observable<any> {
        return this._httpClient.post(
            `${environment.apiUrl}/api/auth/unlock-session`,
            credentials
        );
    }

    /**
     * Check the authentication status
     */
    check(): Observable<boolean> {
        if (this._authenticated) {
            return of(true);
        }

        if (!this.accessToken) {
            return of(false);
        }

        if (AuthUtils.isTokenExpired(this.accessToken)) {
            return of(false);
        }

        return this.signInUsingToken();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Computes SHA-256 of a string using the native Web Crypto API.
     * Returns a lowercase hex string (64 characters).
     */
    private async _sha256Hex(message: string): Promise<string> {
        const buffer = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(message)
        );
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
