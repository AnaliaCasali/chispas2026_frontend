// NUEVO: tests del errorInterceptor, con foco en MANTENER_SESION_EN_403
// (lo usa la edición de eventos: un 403 ahí es "no sos el creador", no una sesión vencida).
import { HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { ApiError, MANTENER_SESION_EN_403, errorInterceptor } from './error-interceptor';
import {
  API,
  providersDePrueba,
  responderError,
  responderSinConexion,
} from '../../../testing/http-de-prueba.helper';
import {
  DOCENTE_PRUEBA,
  cerrarSesionDePrueba,
  iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';

describe('errorInterceptor', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;

  /** Configura TestBed. Llamar DESPUÉS de preparar la sesión: AuthService lee el storage al crearse. */
  function configurar(): void {
    TestBed.configureTestingModule({ providers: providersDePrueba([errorInterceptor]) });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
  }

  /** PATCH de edición de evento, con o sin la marca MANTENER_SESION_EN_403. */
  function editarEvento(mantenerSesion: boolean): { error: () => ApiError | undefined } {
    let error: ApiError | undefined;
    const context = new HttpContext().set(MANTENER_SESION_EN_403, mantenerSesion);
    cliente.patch(`${API}/eventos/editar/5`, { nombre: 'X' }, { context }).subscribe({
      error: (e) => (error = e),
    });
    return { error: () => error };
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
  });

  describe('MANTENER_SESION_EN_403', () => {
    beforeEach(() => {
      iniciarSesionDePrueba(DOCENTE_PRUEBA);
      configurar();
    });

    it('403 con la marca → NO cierra la sesión y entrega el error del back', () => {
      // Act
      const resultado = editarEvento(true);
      responderError(http, 'PATCH', '/eventos/editar/5', 403, {
        message: 'No tienes permiso para editar este evento',
      });
      // Assert
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
      expect(resultado.error()).toBeInstanceOf(ApiError);
      expect(resultado.error()?.status).toBe(403);
      expect(resultado.error()?.message).toBe('No tienes permiso para editar este evento');
    });

    it('403 sin la marca → cierra la sesión (comportamiento de siempre)', () => {
      editarEvento(false);
      responderError(http, 'PATCH', '/eventos/editar/5', 403);

      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });

    it('401 con la marca → cierra la sesión igual (el token venció o es inválido)', () => {
      editarEvento(true);
      responderError(http, 'PATCH', '/eventos/editar/5', 401, { message: 'Token expirado' });

      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });
  });

  describe('ApiError', () => {
    it('sin sesión, un 403 no intenta cerrar nada y conserva status y cuerpo', () => {
      configurar();
      const cuerpo = { message: 'Acceso denegado', details: { codigo: 'X' } };

      const resultado = editarEvento(false);
      responderError(http, 'PATCH', '/eventos/editar/5', 403, cuerpo);

      expect(resultado.error()?.status).toBe(403);
      expect(resultado.error()?.error).toEqual(cuerpo);
    });

    it('si el back no manda message, usa el statusText', () => {
      configurar();

      const resultado = editarEvento(false);
      responderError(http, 'PATCH', '/eventos/editar/5', 500);

      expect(resultado.error()?.message).toBe('Internal Server Error');
    });

    it('sin conexión → status 0', () => {
      configurar();

      const resultado = editarEvento(false);
      responderSinConexion(http, 'PATCH', '/eventos/editar/5');

      expect(resultado.error()?.status).toBe(0);
    });
  });
});
