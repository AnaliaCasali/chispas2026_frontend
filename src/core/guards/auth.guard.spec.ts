import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import {
  USUARIO_PRUEBA, cerrarSesionDePrueba, iniciarSesionCorrupta, iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import { providersDePrueba } from '../../../testing/http-de-prueba.helper';

describe('authGuard', () => {
  /**
   * Configura TestBed y ejecuta el guard.
   * Llamar DESPUÉS de preparar la sesión: AuthService lee el storage al crearse.
   */
  function ejecutar(plataforma: 'browser' | 'server' = 'browser') {
    TestBed.configureTestingModule({
      providers: [...providersDePrueba(), { provide: PLATFORM_ID, useValue: plataforma }],
    });
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  }

  afterEach(() => cerrarSesionDePrueba());

  it('con sesión de GRUPO → deja pasar', () => {
    // Arrange
    iniciarSesionDePrueba();
    // Act
    const resultado = ejecutar();
    // Assert
    expect(resultado).toBe(true);
  });

  it('con sesión de otro rol → también deja pasar (el rol lo controla roleGuard)', () => {
    iniciarSesionDePrueba(USUARIO_PRUEBA);
    expect(ejecutar()).toBe(true);
  });

  it('sin sesión → redirige a /login', () => {
    // Act
    const resultado = ejecutar() as UrlTree;
    // Assert
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(resultado.toString()).toBe('/login');
  });

  it('con sesión corrupta → cierra la sesión y redirige a /login', () => {
    // Arrange
    iniciarSesionCorrupta();
    // Act
    const resultado = ejecutar() as UrlTree;
    // Assert
    expect(resultado.toString()).toBe('/login');
    const auth = TestBed.inject(AuthService);
    expect(auth.token()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('en el servidor (SSR) → deja pasar sin evaluar la sesión', () => {
    expect(ejecutar('server')).toBe(true);
  });
});
