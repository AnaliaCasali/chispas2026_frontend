import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import {
  ESTUDIANTE_PRUEBA, DOCENTE_PRUEBA, cerrarSesionDePrueba, iniciarSesionCorrupta, iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import { providersDePrueba } from '../../../testing/http-de-prueba.helper';

describe('authGuard', () => {
  function ejecutar(plataforma: 'browser' | 'server' = 'browser') {
    TestBed.configureTestingModule({
      providers: [...providersDePrueba(), { provide: PLATFORM_ID, useValue: plataforma }],
    });
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  }

  afterEach(() => cerrarSesionDePrueba());

  it('con sesión de ESTUDIANTE → deja pasar', () => {
    iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);
    expect(ejecutar()).toBe(true);
  });

  it('con sesión de otro rol → también deja pasar (el rol lo controla roleGuard)', () => {
    iniciarSesionDePrueba(DOCENTE_PRUEBA);
    expect(ejecutar()).toBe(true);
  });

  it('sin sesión → redirige a /login', () => {
    const resultado = ejecutar() as UrlTree;
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(resultado.toString()).toBe('/login');
  });

  it('con sesión corrupta → cierra la sesión y redirige a /login', () => {
    iniciarSesionCorrupta();
    const resultado = ejecutar() as UrlTree;
    expect(resultado.toString()).toBe('/login');
    const auth = TestBed.inject(AuthService);
    expect(auth.token()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('en el servidor (SSR) → deja pasar sin evaluar la sesión', () => {
    expect(ejecutar('server')).toBe(true);
  });
});