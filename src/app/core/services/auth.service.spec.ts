import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Role } from '../models/user';
import { AuthResponse } from '../models/auth.model';
import {
  CLAVE_TOKEN,
  CLAVE_USUARIO,
  DOCENTE_PRUEBA,
  ESTUDIANTE_PRUEBA,
  cerrarSesionDePrueba,
  crearTokenDePrueba,
  crearUsuarioDe,
  iniciarSesionCorrupta,
  iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import {
  CLAVE_PRUEBA,
  crearAuthResponse,
  crearCambiarPasswordRequest,
  crearForgotPasswordRequest,
  crearLoginRequest,
  crearRegistroUsuario,
  crearResetPasswordRequest,
} from '../../../testing/datos-de-prueba.helper';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
} from '../../../testing/http-de-prueba.helper';

describe('AuthService', () => {
  let http: HttpTestingController;

  /** Crea el service DESPUÉS de preparar el estado: lo lee una sola vez al construirse. */
  function crearAuthService(): AuthService {
    TestBed.configureTestingModule({ providers: providersDePrueba() });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('estado inicial y signals derivados', () => {
    it('sin sesión guardada en storage → inicia no autenticado con signals en null', () => {
      // Arrange (storage vacío por default)

      // Act
      const auth = crearAuthService();

      // Assert
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(auth.currentUser()).toBeNull();
      expect(auth.userRole()).toBeNull();
    });

    it('con sesión guardada de ESTUDIANTE → restaura token, usuario y rol ESTUDIANTE', () => {
      // Arrange
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);

      // Act
      const auth = crearAuthService();

      // Assert
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.token()).toBe(localStorage.getItem(CLAVE_TOKEN));
      expect(auth.currentUser()).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
      expect(auth.userRole()).toBe(Role.ESTUDIANTE);
    });

    it('con sesión guardada de DOCENTE → restaura rol DOCENTE', () => {
      // Arrange
      iniciarSesionDePrueba(DOCENTE_PRUEBA);

      // Act
      const auth = crearAuthService();

      // Assert
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.userRole()).toBe(Role.DOCENTE);
    });

    it('con usuario corrupto en storage → borra la clave corrupta y no autentica', () => {
      // Arrange
      iniciarSesionCorrupta();

      // Act
      const auth = crearAuthService();

      // Assert
      expect(auth.currentUser()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
    });

    it('con token pero sin usuario en storage → isAuthenticated es false', () => {
      // Arrange
      localStorage.setItem(CLAVE_TOKEN, crearTokenDePrueba(ESTUDIANTE_PRUEBA));
      localStorage.removeItem(CLAVE_USUARIO);

      // Act
      const auth = crearAuthService();

      // Assert
      expect(auth.token()).not.toBeNull();
      expect(auth.currentUser()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('con usuario pero sin token en storage → isAuthenticated es false', () => {
      // Arrange
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(crearUsuarioDe(ESTUDIANTE_PRUEBA)));

      // Act
      const auth = crearAuthService();

      // Assert
      expect(auth.token()).toBeNull();
      expect(auth.currentUser()).not.toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('login', () => {
    it('credenciales válidas → envía POST a /auth/login, guarda sesión en storage y actualiza signals', () => {
      // Arrange
      const auth = crearAuthService();
      const credenciales = crearLoginRequest();
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA);
      const respuesta = crearAuthResponse({ token });
      let resultado: AuthResponse | undefined;

      // Act
      auth.login(credenciales).subscribe((r) => (resultado = r));
      const req = responder(http, 'POST', '/auth/login', respuesta);

      // Assert
      expect(req.request.body).toEqual(credenciales);
      expect(resultado).toEqual(respuesta);
      expect(auth.token()).toBe(token);
      expect(auth.currentUser()).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.userRole()).toBe(Role.ESTUDIANTE);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(token);
      expect(localStorage.getItem(CLAVE_USUARIO)).toEqual(JSON.stringify(crearUsuarioDe(ESTUDIANTE_PRUEBA)));
    });

    it('respuesta con token JWT malformado → propaga error y no persiste sesión', () => {
      // Arrange
      const auth = crearAuthService();
      const credenciales = crearLoginRequest();
      let errorRecibido: Error | undefined;

      // Act
      auth.login(credenciales).subscribe({
        next: () => {},
        error: (err) => (errorRecibido = err),
      });
      responder(http, 'POST', '/auth/login', { token: 'token-invalido-sin-partes' });

      // Assert
      expect(errorRecibido).toBeDefined();
      expect(errorRecibido?.message).toBe('Token JWT inválido o malformado');
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(auth.currentUser()).toBeNull();
    });

    it.each([
      { status: 400, desc: 'solicitud inválida' },
      { status: 401, desc: 'credenciales incorrectas' },
      { status: 500, desc: 'error interno del backend' },
    ])('backend responde $status ($desc) → propaga error y no guarda sesión', ({ status }) => {
      // Arrange
      const auth = crearAuthService();
      let errorStatus: number | undefined;

      // Act
      auth.login(crearLoginRequest()).subscribe({
        error: (err: HttpErrorResponse) => (errorStatus = err.status),
      });
      responderError(http, 'POST', '/auth/login', status);

      // Assert
      expect(errorStatus).toBe(status);
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    });

    it('backend sin conexión (status 0) → propaga error de red y no autentica', () => {
      // Arrange
      const auth = crearAuthService();
      let huboError = false;

      // Act
      auth.login(crearLoginRequest()).subscribe({
        error: () => (huboError = true),
      });
      responderSinConexion(http, 'POST', '/auth/login');

      // Assert
      expect(huboError).toBe(true);
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
    });
  });

  describe('registrarUsuario', () => {
    it('datos válidos → envía POST a /auth/register/usuario y autentica al usuario', () => {
      // Arrange
      const auth = crearAuthService();
      const datos = crearRegistroUsuario();
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA);
      const respuesta = crearAuthResponse({ token });
      let resultado: AuthResponse | undefined;

      // Act
      auth.registrarUsuario(datos).subscribe((r) => (resultado = r));
      const req = responder(http, 'POST', '/auth/register/usuario', respuesta);

      // Assert
      expect(req.request.body).toEqual(datos);
      expect(resultado).toEqual(respuesta);
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.userRole()).toBe(Role.ESTUDIANTE);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(token);
    });

    it('registro con email omitido → envía POST con datos válidos y guarda sesión', () => {
      // Arrange
      const auth = crearAuthService();
      const datos = crearRegistroUsuario({ email: undefined });
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA);

      // Act
      auth.registrarUsuario(datos).subscribe();
      const req = responder(http, 'POST', '/auth/register/usuario', crearAuthResponse({ token }));

      // Assert
      expect(req.request.body.email).toBeUndefined();
      expect(auth.isAuthenticated()).toBe(true);
    });

    it.each([
      { status: 400, desc: 'datos requeridos faltantes' },
      { status: 409, desc: 'DNI o email ya registrado' },
      { status: 500, desc: 'falla del servidor' },
    ])('backend responde $status ($desc) → propaga error y no guarda sesión', ({ status }) => {
      // Arrange
      const auth = crearAuthService();
      let errorStatus: number | undefined;

      // Act
      auth.registrarUsuario(crearRegistroUsuario()).subscribe({
        error: (err: HttpErrorResponse) => (errorStatus = err.status),
      });
      responderError(http, 'POST', '/auth/register/usuario', status);

      // Assert
      expect(errorStatus).toBe(status);
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
    });

    it('servidor sin conexión (status 0) → propaga error y estado permanece limpio', () => {
      // Arrange
      const auth = crearAuthService();
      let huboError = false;

      // Act
      auth.registrarUsuario(crearRegistroUsuario()).subscribe({
        error: () => (huboError = true),
      });
      responderSinConexion(http, 'POST', '/auth/register/usuario');

      // Assert
      expect(huboError).toBe(true);
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('cambiarPassword', () => {
    it('datos válidos → envía PATCH a /auth/usuarios/cambiar-password', () => {
      // Arrange
      const auth = crearAuthService();
      const datos = crearCambiarPasswordRequest();
      let completado = false;

      // Act
      auth.cambiarPassword(datos).subscribe({
        complete: () => (completado = true),
      });
      const req = responder(http, 'PATCH', '/auth/usuarios/cambiar-password', null);

      // Assert
      expect(req.request.body).toEqual(datos);
      expect(completado).toBe(true);
    });

    it.each([
      { status: 400, desc: 'contraseña actual incorrecta' },
      { status: 401, desc: 'token ausente o vencido' },
      { status: 500, desc: 'error interno' },
    ])('backend responde $status ($desc) → propaga error', ({ status }) => {
      // Arrange
      const auth = crearAuthService();
      let errorStatus: number | undefined;

      // Act
      auth.cambiarPassword(crearCambiarPasswordRequest()).subscribe({
        error: (err: HttpErrorResponse) => (errorStatus = err.status),
      });
      responderError(http, 'PATCH', '/auth/usuarios/cambiar-password', status);

      // Assert
      expect(errorStatus).toBe(status);
    });

    it('sin conexión (status 0) → propaga error', () => {
      // Arrange
      const auth = crearAuthService();
      let huboError = false;

      // Act
      auth.cambiarPassword(crearCambiarPasswordRequest()).subscribe({
        error: () => (huboError = true),
      });
      responderSinConexion(http, 'PATCH', '/auth/usuarios/cambiar-password');

      // Assert
      expect(huboError).toBe(true);
    });
  });

  describe('solicitarRecuperacion', () => {
    it('email válido → envía POST a /auth/forgot-password', () => {
      // Arrange
      const auth = crearAuthService();
      const datos = crearForgotPasswordRequest();
      let completado = false;

      // Act
      auth.solicitarRecuperacion(datos).subscribe({
        complete: () => (completado = true),
      });
      const req = responder(http, 'POST', '/auth/forgot-password', null);

      // Assert
      expect(req.request.body).toEqual(datos);
      expect(completado).toBe(true);
    });

    it.each([
      { status: 400, desc: 'formato de email inválido' },
      { status: 404, desc: 'email no encontrado' },
      { status: 500, desc: 'error de servidor' },
    ])('backend responde $status ($desc) → propaga error', ({ status }) => {
      // Arrange
      const auth = crearAuthService();
      let errorStatus: number | undefined;

      // Act
      auth.solicitarRecuperacion(crearForgotPasswordRequest()).subscribe({
        error: (err: HttpErrorResponse) => (errorStatus = err.status),
      });
      responderError(http, 'POST', '/auth/forgot-password', status);

      // Assert
      expect(errorStatus).toBe(status);
    });

    it('sin conexión (status 0) → propaga error', () => {
      // Arrange
      const auth = crearAuthService();
      let huboError = false;

      // Act
      auth.solicitarRecuperacion(crearForgotPasswordRequest()).subscribe({
        error: () => (huboError = true),
      });
      responderSinConexion(http, 'POST', '/auth/forgot-password');

      // Assert
      expect(huboError).toBe(true);
    });
  });

  describe('restablecerPassword', () => {
    it('token y nueva clave válidos → envía POST a /auth/reset-password', () => {
      // Arrange
      const auth = crearAuthService();
      const datos = crearResetPasswordRequest();
      let completado = false;

      // Act
      auth.restablecerPassword(datos).subscribe({
        complete: () => (completado = true),
      });
      const req = responder(http, 'POST', '/auth/reset-password', null);

      // Assert
      expect(req.request.body).toEqual(datos);
      expect(completado).toBe(true);
    });

    it.each([
      { status: 400, desc: 'token vencido o password no coincide' },
      { status: 404, desc: 'token inexistente' },
      { status: 500, desc: 'error interno' },
    ])('backend responde $status ($desc) → propaga error', ({ status }) => {
      // Arrange
      const auth = crearAuthService();
      let errorStatus: number | undefined;

      // Act
      auth.restablecerPassword(crearResetPasswordRequest()).subscribe({
        error: (err: HttpErrorResponse) => (errorStatus = err.status),
      });
      responderError(http, 'POST', '/auth/reset-password', status);

      // Assert
      expect(errorStatus).toBe(status);
    });

    it('sin conexión (status 0) → propaga error', () => {
      // Arrange
      const auth = crearAuthService();
      let huboError = false;

      // Act
      auth.restablecerPassword(crearResetPasswordRequest()).subscribe({
        error: () => (huboError = true),
      });
      responderSinConexion(http, 'POST', '/auth/reset-password');

      // Assert
      expect(huboError).toBe(true);
    });
  });

  describe('logout', () => {
    it('sesión activa → borra storage, resetea signals y redirige a /login', () => {
      // Arrange
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);
      const auth = crearAuthService();
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      // Act
      auth.logout();

      // Assert
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(auth.currentUser()).toBeNull();
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('sin sesión previa → limpia storage y redirige a /login sin fallar', () => {
      // Arrange
      const auth = crearAuthService();
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      // Act
      auth.logout();

      // Assert
      expect(auth.isAuthenticated()).toBe(false);
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('hasRole', () => {
    it.each([
      { roles: [Role.ESTUDIANTE], esperado: true },
      { roles: [Role.ESTUDIANTE, Role.DOCENTE], esperado: true },
      { roles: [Role.ADMIN], esperado: false },
      { roles: [], esperado: false },
    ])('usuario ESTUDIANTE con roles $roles → $esperado', ({ roles, esperado }) => {
      // Arrange
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);
      const auth = crearAuthService();

      // Act
      const resultado = auth.hasRole(roles);

      // Assert
      expect(resultado).toBe(esperado);
    });

    it('sin sesión iniciada → devuelve false para cualquier rol', () => {
      // Arrange
      const auth = crearAuthService();

      // Act & Assert
      expect(auth.hasRole([Role.ESTUDIANTE])).toBe(false);
      expect(auth.hasRole([Role.DOCENTE])).toBe(false);
      expect(auth.hasRole([])).toBe(false);
    });
  });

  describe('getters auxiliares (getEmail, getNombre, getRol, getId)', () => {
    it('con sesión iniciada → extrae los datos correctamente desde el token y usuario', () => {
      // Arrange
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);
      const auth = crearAuthService();

      // Act & Assert
      expect(auth.getEmail()).toBe(ESTUDIANTE_PRUEBA.username);
      expect(auth.getNombre()).toBe(ESTUDIANTE_PRUEBA.nombre);
      expect(auth.getRol()).toBe(Role.ESTUDIANTE);
      expect(auth.getId()).toBe(ESTUDIANTE_PRUEBA.id);
    });

    it('sin sesión activa → todos los getters devuelven null', () => {
      // Arrange
      const auth = crearAuthService();

      // Act & Assert
      expect(auth.getEmail()).toBeNull();
      expect(auth.getNombre()).toBeNull();
      expect(auth.getRol()).toBeNull();
      expect(auth.getId()).toBeNull();
    });

    it.each([
      { expSegundos: 29, desc: 'token próximo a expirar (29s)' },
      { expSegundos: 31, desc: 'token con margen seguro (31s)' },
    ])('token con $desc → getEmail y getNombre leen el payload sin fallar', ({ expSegundos }) => {
      // Arrange
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA, expSegundos);
      localStorage.setItem(CLAVE_TOKEN, token);
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(crearUsuarioDe(ESTUDIANTE_PRUEBA)));
      const auth = crearAuthService();

      // Act & Assert
      expect(auth.getEmail()).toBe(ESTUDIANTE_PRUEBA.username);
      expect(auth.getNombre()).toBe(ESTUDIANTE_PRUEBA.nombre);
    });
  });
});