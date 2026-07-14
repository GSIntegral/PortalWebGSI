import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthUtils } from './auth.utils';

/**
 * Interceptor HTTP que agrega el encabezado de autenticación a las solicitudes salientes.
 *
 * - Si existe un token de acceso válido y no expirado, agrega el encabezado `Authorization`.
 * - Maneja errores HTTP 401 (No autorizado) cerrando la sesión del usuario, salvo cuando el
 *   error proviene del endpoint de login (credenciales incorrectas).
 *
 * @param req - La solicitud HTTP saliente.
 * @param next - El siguiente manejador en la cadena de solicitudes HTTP.
 * @returns Un observable del flujo de eventos HTTP.
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Clone the request object
    let newReq = req.clone();

    // If the access token didn't expire, add the Authorization header.
    if (
        authService.accessToken &&
        !AuthUtils.isTokenExpired(authService.accessToken)
    ) {
        newReq = req.clone({
            headers: req.headers.set(
                'Authorization',
                'Bearer ' + authService.accessToken
            ),
        });
    }

    // Response
    return next(newReq).pipe(
        catchError((error) => {
            // Catch "401 Unauthorized" responses
            if (error instanceof HttpErrorResponse && error.status === 401) {
                // A 401 from the login endpoint means wrong credentials — do not
                // sign out or reload; let the sign-in component handle the error.
                if (!req.url.includes('Auth/Login')) {
                    authService.onLogOut();
                }
            }

            return throwError(() => error);
        })
    );
};
