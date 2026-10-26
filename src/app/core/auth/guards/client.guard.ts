import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth.service';

/** Exige una sesión de CLIENTE del portal (usuario con login independiente). */
export const ClientGuard: CanActivateFn | CanActivateChildFn = () => {
    const router: Router = inject(Router);
    const authService = inject(AuthService);

    return authService.check().pipe(
        map((authenticated) => {
            if (!authenticated) {
                return router.createUrlTree(['/login']);
            }

            // El equipo no tiene contraseña temporal del portal que cambiar.
            return authService.sessionKind === 'client'
                ? true
                : router.createUrlTree(['/sst-dashboard']);
        })
    );
};
