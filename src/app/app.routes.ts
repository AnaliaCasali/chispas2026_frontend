


// src/app/app.routes.ts
import { Routes, UrlSegment } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './core/models/user';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'bienvenida',
    pathMatch: 'full',
  },
  {
    path: 'bienvenida',
    loadComponent: () =>
      import('./features/components/bienvenida/bienvenida').then(
        (m) => m.BienvenidaComponent
      ),
    canActivate: [guestGuard], // Si ya está logueado, guestGuard lo manda directo a /inicio
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  /*{
    path: 'actividad/relacionar',
    loadComponent: () => import('./features/actividades/actividad-relacionar/actividad-relacionar').then((m) => m.ActividadRelacionarComponent),
    canActivate: [authGuard]
  },*/
  {
  path: 'inicio',
  loadComponent: () => import('./features/components/inicio/inicio').then((m) => m.InicioComponent),
  canActivate: [authGuard]
  },
  {
    path: 'mi-carpeta',
    loadComponent: () =>
      import('./features/components/mi-carpeta/mi-carpeta')
        .then((m) => m.MiCarpetaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'mi-carpeta/materias/:id/actividades',
    loadComponent: () =>
      import('./features/components/actividades-materia/actividades-materia')
        .then((m) => m.ActividadesMateriaComponent),
    canActivate: [authGuard],
    path: 'actividad/ordenar',
    loadComponent: () => import('./features/actividades/actividad-ordenar/actividad-ordenar').then((m) => m.ActividadOrdenarComponent),
    canActivate: [authGuard]
  }, 
  // Comodín para URLs no encontradas
  {
    path: '**',
    redirectTo: 'login',
  },
  
];
