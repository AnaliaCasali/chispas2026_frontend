


// src/app/app.routes.ts
import { Routes, UrlSegment } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './core/models/user';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
  path: 'actividad/relacionar',
  loadComponent: () => import('./features/actividades/actividad-relacionar/actividad-relacionar').then((m) => m.ActividadRelacionarComponent),
  canActivate: [authGuard]
  },
  {
    path: 'inicio',
    loadComponent: () => import('./features/components/inicio/inicio').then((m) => m.Inicio),
    canActivate: [guestGuard],
  },
  // Comodín para URLs no encontradas
  {
    path: '**',
    redirectTo: 'login',
  },
];
