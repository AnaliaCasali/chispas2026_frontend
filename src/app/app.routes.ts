// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

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
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/components/inicio/inicio').then(
        (m) => m.InicioComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'mi-carpeta',
    loadComponent: () =>
      import('./features/components/mi-carpeta/mi-carpeta').then(
        (m) => m.MiCarpetaComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'mi-carpeta/materias/:id/actividades',
    loadComponent: () =>
      import(
        './features/components/actividades-materia/actividades-materia'
      ).then((m) => m.ActividadesMateriaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'estudiante',
    loadComponent: () =>
      import(
        './features/components/perfil-estudiante/perfil-estudiante.component'
      ).then((m) => m.PerfilEstudianteComponent),
    canActivate: [authGuard],
  },
  {
  path: 'horarios',
  loadComponent: () => import('./features/components/horarios/horarios').then(m => m.HorariosComponent),
  canActivate: [authGuard]
  },
  {
    path: 'actividad/ordenar',
    loadComponent: () =>
      import('./features/actividades/actividad-ordenar/actividad-ordenar').then(
        (m) => m.ActividadOrdenarComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'actividad/ordenar/:tareaId',
    loadComponent: () =>
      import('./features/actividades/actividad-ordenar/actividad-ordenar').then(
        (m) => m.ActividadOrdenarComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'actividad/unir-con-flechas',
    loadComponent: () =>
      import('./features/actividades/actividad-unir/actividad-unir').then(
        (m) => m.ActividadUnirComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'actividad/unir-con-flechas/:tareaId',
    loadComponent: () =>
      import('./features/actividades/actividad-unir/actividad-unir').then(
        (m) => m.ActividadUnirComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
