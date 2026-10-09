import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

//Evita que usuarios autenticados vean el /login o /register)
export const guestGuard: CanActivateFn = () => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  if (!isBrowser) return true;

  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya está logueado, lo redirigimos al inicio en lugar de dejarlo en /login
  return authService.isAuthenticated()
    ? router.createUrlTree(['/inicio'])
    : true;
};
