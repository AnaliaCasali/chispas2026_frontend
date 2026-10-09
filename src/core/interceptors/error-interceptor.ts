// EDITADO: se suma HttpContextToken para que una petición pueda pedir "no cerrar sesión en 403"
import { HttpContextToken, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Error que devuelven los interceptores ante una respuesta HTTP fallida.
 * Es un `Error` (sirve `err.message`) pero conserva `status` y el cuerpo
 * `error` del backend, para que cada pantalla pueda decidir por código.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly error: any = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Endpoints donde el backend rechaza con 401/403 por contraseña incorrecta
// (o por token de recuperación inválido/vencido).
const ENDPOINTS_CREDENCIALES = [
  '/auth/login',
  '/auth/register',
  '/auth/usuarios/cambiar-password',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export function esValidacionDeCredenciales(url: string): boolean {
  return ENDPOINTS_CREDENCIALES.some((endpoint) => url.includes(endpoint));
}

/**
 * NUEVO: marca opcional por petición. Si vale true, un 403 NO cierra la sesión.
 * Sirve cuando el back responde 403 por una regla de negocio ("no sos el dueño
 * de este evento") y no porque la sesión haya vencido (eso el back lo responde con 401).
 * Uso: this.http.patch(url, body, { context: new HttpContext().set(MANTENER_SESION_EN_403, true) })
 */
export const MANTENER_SESION_EN_403 = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // EDITADO: solo se cierra la sesión si había una (token vencido). Un visitante que nunca
      // inició sesión y recibe 401/403 en una pantalla pública no debe ser mandado al login.
      // Además, un 403 no cierra la sesión si la petición lo pidió con MANTENER_SESION_EN_403.
      const es403Permitido = error.status === 403 && req.context.get(MANTENER_SESION_EN_403);
      if (
        [401, 403].includes(error.status) &&
        !es403Permitido &&
        !esValidacionDeCredenciales(req.url) &&
        authService.isAuthenticated()
      ) {
        authService.logout();
      }

      const errorMessage =
        error.error?.message || error.statusText || 'Error de comunicación con el servidor';
      return throwError(() => new ApiError(errorMessage, error.status, error.error));
    }),
  );
};
