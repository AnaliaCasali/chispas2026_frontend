import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { esValidacionDeCredenciales } from './error-interceptor';
import { environment } from '../../../environments/environment';
import { isTokenExpired } from '../../shared/utils/jwt.utils';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
 // 1. Verificación de URL propia y endpoints públicos de autenticación
  const esApiPropia = req.url.startsWith(environment.apiUrl);

  // Tu API_URL en el servicio es `${environment.apiUrl}/auth`
  const esPublicUrl = req.url.includes('/auth/login') ||
                      req.url.includes('/auth/register') ||
                      req.url.includes('/auth/forgot-password') ||
                      req.url.includes('/auth/reset-password') ||
                      req.url.includes('/public/') ||
                      // GET /api/v1/localidades

                      (req.method === 'GET' && req.url.endsWith('/localidades'));

  const token = authService.token();

  let peticion = req;

  if (esApiPropia && !esPublicUrl && token) {
    // 2. Validación preventiva en el cliente antes de consumir red
    if (isTokenExpired(token)) {
      authService.logout(); // Limpia storage, resetea signals y redirige a /login
      return throwError(() => new Error('Sesión expirada. Por favor vuelva a iniciar sesión.'));
    }

    // 3. Inyección del token Bearer en el header
    peticion = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 4. Captura de error 401 del servidor backend
  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && esApiPropia && !esPublicUrl && !esValidacionDeCredenciales(req.url)) {
        authService.logout(); // Limpia storage, resetea signals y redirige a /login
      }
      return throwError(() => err);
    })
  );
};
