import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    catchError,
    from,
    map,
    Observable,
    of,
    switchMap,
    throwError,
    timeout,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '../user/user.service';
import { AuthUtils } from './auth.utils';

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
     * Sign in — HU_001
     *
     * Hashes the password with SHA-256 (Web Crypto API) before sending,
     * then POSTs to /api/Auth/Login. Decodes the returned JWT to build
     * the User object from claims. Applies a 10-second network timeout.
     *
     * @param credentials
     */
    signIn(credentials: { email: string; password: string }): Observable<any> {
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
