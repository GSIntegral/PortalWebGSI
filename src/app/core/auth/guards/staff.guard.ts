import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth.service';

/**
 * Exige una sesión del EQUIPO de GS Integral (login de la plataforma Facil ISO). Los clientes del
 * portal que intenten entrar a una pantalla de administración vuelven a su tablero; quien no ha
 * iniciado sesión va al acceso del equipo. El backend rechaza igualmente cualquier token del portal
 * en estos endpoints: esta guarda solo evita mostrar una pantalla que no podría usar.
 */
export const StaffGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
    const router: Router = inject(Router);
    const authService = inject(AuthService);

    return authService.check().pipe(
        map((authenticated) => {
            if (!authenticated) {
                return router.createUrlTree(['/login/equipo'], {
                    queryParams: { redirectURL: state.url },
                });
            }

            if (authService.sessionKind !== 'staff') {
                return router.createUrlTree(['/sst-dashboard']);
            }

            return true;
        })
    );
};
