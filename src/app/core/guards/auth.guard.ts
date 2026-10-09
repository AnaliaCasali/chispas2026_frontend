import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege las pantallas privadas
export const authGuard: CanActivateFn = () => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  if (!isBrowser) return true; // En el servidor no evalúa localStorage

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Si tenía una sesión corrupta o token vencido, la limpiamos
  authService.logout();
  return router.createUrlTree(['/login']);
};
