import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';

/** Ruta donde el cliente cambia la contraseña temporal de su primer ingreso. */
const CHANGE_PASSWORD_URL = '/cambiar-contrasena';

/**
 * Exige una sesión válida de cualquier tipo (equipo o cliente). Un cliente que aún no cambió
 * su contraseña temporal solo puede estar en la pantalla de cambio de contraseña.
 */
export const AuthGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
    const router: Router = inject(Router);
    const userService = inject(UserService);

    // Check the authentication status
    return inject(AuthService)
        .check()
        .pipe(
            switchMap((authenticated) => {
                // If the user is not authenticated...
                if (!authenticated) {
                    // Redirect to the login page with a redirectUrl param
                    const redirectURL =
                        state.url === '/logout' ? '' : `redirectURL=${state.url}`;
                    const urlTree = router.parseUrl(`login?${redirectURL}`);

                    return of(urlTree);
                }

                const user = userService.currentUser;
                if (
                    user?.kind === 'client' &&
                    user.isFirstLogin &&
                    !state.url.startsWith(CHANGE_PASSWORD_URL)
                ) {
                    return of(router.parseUrl(CHANGE_PASSWORD_URL));
                }

                // Allow the access
                return of(true);
            })
        );
};
