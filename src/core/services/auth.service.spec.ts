import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user';
import {
  CLAVE_TOKEN, CLAVE_USUARIO, GRUPO_PRUEBA, ORGANIZADOR_PRUEBA, USUARIO_PRUEBA,
  cerrarSesionDePrueba, crearTokenDePrueba, crearUsuarioDe,
  iniciarSesionCorrupta, iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import { CLAVE_PRUEBA, crearLoginRequest, crearRegistroUsuario } from '../../../testing/datos-de-prueba.helper';
import {
  peticion, providersDePrueba, responder, responderError,
} from '../../../testing/http-de-prueba.helper';

describe('AuthService', () => {
  let http: HttpTestingController;

  /** Crea el servicio DESPUÉS de preparar el storage: lo lee una sola vez al construirse. */
  function crearAuthService(): AuthService {
    TestBed.configureTestingModule({ providers: providersDePrueba() });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
  });

  describe('estado inicial', () => {
    it('sin sesión guardada → no autenticado', () => {
      // Act
      const auth = crearAuthService();
      // Assert
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.currentUser()).toBeNull();
      expect(auth.userRole()).toBeNull();
    });

    it('con sesión guardada → restaura token y usuario', () => {
      // Arrange
      iniciarSesionDePrueba(USUARIO_PRUEBA);
      // Act
      const auth = crearAuthService();
      // Assert
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.currentUser()).toEqual(crearUsuarioDe(USUARIO_PRUEBA));
      expect(auth.userRole()).toBe(Role.USUARIO);
    });

    it('con usuario corrupto en storage → lo borra y no autentica', () => {
      // Arrange
      iniciarSesionCorrupta();
      // Act
      const auth = crearAuthService();
      // Assert
      expect(auth.currentUser()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
    });
  });

  describe('login', () => {
    it('envía las credenciales y guarda la sesión con los datos del token', () => {
      // Arrange
      const auth = crearAuthService();
      const token = crearTokenDePrueba(GRUPO_PRUEBA);
      // Act
      auth.login(crearLoginRequest()).subscribe();
      const req = responder(http, 'POST', '/auth/login', { token });
      // Assert
      expect(req.request.body).toEqual({ username: GRUPO_PRUEBA.email, password: CLAVE_PRUEBA });
      expect(auth.token()).toBe(token);
      expect(auth.currentUser()).toEqual(crearUsuarioDe(GRUPO_PRUEBA));
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(token);
      expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO)!)).toEqual(crearUsuarioDe(GRUPO_PRUEBA));
    });

    it('credenciales inválidas (401) → propaga el error y no guarda sesión', () => {
      // Arrange
      const auth = crearAuthService();
      let status = 0;
      // Act
      auth.login(crearLoginRequest({ password: 'incorrecta' })).subscribe({ error: (e) => (status = e.status) });
      responderError(http, 'POST', '/auth/login', 401);
      // Assert
      expect(status).toBe(401);
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    });

    it('token malformado → error y no guarda sesión', () => {
      // Arrange
      const auth = crearAuthService();
      let error: Error | undefined;
      // Act
      auth.login(crearLoginRequest()).subscribe({ error: (e) => (error = e) });
      responder(http, 'POST', '/auth/login', { token: 'no-es-jwt' });
      // Assert
      expect(error?.message).toContain('Token JWT inválido');
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    });
  });

  describe('registro (login automático)', () => {
    it('registrarUsuario → POST /register/usuario y queda logueado', () => {
      // Arrange
      const auth = crearAuthService();
      const datos = crearRegistroUsuario();
      // Act
      auth.registrarUsuario(datos).subscribe();
      const req = responder(http, 'POST', '/auth/register/usuario', { token: crearTokenDePrueba(USUARIO_PRUEBA) });
      // Assert
      expect(req.request.body).toEqual(datos);
      expect(auth.userRole()).toBe(Role.USUARIO);
    });

    it('registrarGrupo → POST /register/grupo y queda logueado como GRUPO', () => {
      const auth = crearAuthService();
      auth.registrarGrupo({ ...crearRegistroUsuario(), director: 'Joaquín' }).subscribe();
      responder(http, 'POST', '/auth/register/grupo', { token: crearTokenDePrueba(GRUPO_PRUEBA) });
      expect(auth.userRole()).toBe(Role.GRUPO);
    });

    it('registrarOrganizador → POST /register/organizador y queda logueado como ORGANIZADOR', () => {
      const auth = crearAuthService();
      auth.registrarOrganizador(crearRegistroUsuario()).subscribe();
      responder(http, 'POST', '/auth/register/organizador', { token: crearTokenDePrueba(ORGANIZADOR_PRUEBA) });
      expect(auth.userRole()).toBe(Role.ORGANIZADOR);
    });

    it('email ya registrado (409) → no guarda sesión', () => {
      const auth = crearAuthService();
      auth.registrarUsuario(crearRegistroUsuario()).subscribe({ error: () => {} });
      responderError(http, 'POST', '/auth/register/usuario', 409);
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('cambiarPassword', () => {
    it('envía PATCH /usuarios/cambiar-password con el cuerpo y no modifica la sesión', () => {
      // Arrange
      iniciarSesionDePrueba();
      const auth = crearAuthService();
      const datos = { currentPassword: CLAVE_PRUEBA, newPassword: 'Nueva2026!', confirmationPassword: 'Nueva2026!' };
      let completo = false;
      // Act
      auth.cambiarPassword(datos).subscribe({ complete: () => (completo = true) });
      const req = peticion(http, 'PATCH', '/auth/usuarios/cambiar-password');
      req.flush(null, { status: 204, statusText: 'No Content' });
      // Assert
      expect(req.request.body).toEqual(datos);
      expect(completo).toBe(true);
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    it('borra storage y signals y navega a /login', () => {
      // Arrange
      iniciarSesionDePrueba();
      const auth = crearAuthService();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      // Act
      auth.logout();
      // Assert
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(auth.currentUser()).toBeNull();
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });
  });
0
  describe('hasRole', () => {
    it.each([
      { roles: [Role.GRUPO], esperado: true },
      { roles: [Role.USUARIO, Role.GRUPO], esperado: true },
      { roles: [Role.ORGANIZADOR], esperado: false },
      { roles: [], esperado: false },
    ])('GRUPO con roles $roles → $esperado', ({ roles, esperado }) => {
      iniciarSesionDePrueba(GRUPO_PRUEBA);
      const auth = crearAuthService();
      expect(auth.hasRole(roles)).toBe(esperado);
    });

    it('sin sesión → false', () => {
      const auth = crearAuthService();
      expect(auth.hasRole([Role.GRUPO, Role.USUARIO, Role.ORGANIZADOR])).toBe(false);
    });
  });

  describe('accesos a los claims', () => {
    it('con sesión → devuelve los datos del token', () => {
      iniciarSesionDePrueba(ORGANIZADOR_PRUEBA);
      const auth = crearAuthService();
      expect(auth.getId()).toBe(ORGANIZADOR_PRUEBA.id);
      expect(auth.getEmail()).toBe(ORGANIZADOR_PRUEBA.email);
      expect(auth.getNombre()).toBe(ORGANIZADOR_PRUEBA.nombre);
      expect(auth.getRol()).toBe(Role.ORGANIZADOR);
    });

    it('nombre con tildes y ñ → se decodifica bien (Unicode)', () => {
      const conTildes = { ...USUARIO_PRUEBA, nombre: 'José Muñoz' };
      localStorage.setItem(CLAVE_TOKEN, crearTokenDePrueba(conTildes));
      const auth = crearAuthService();
      expect(auth.getNombre()).toBe('José Muñoz');
    });

    it('sin sesión → todos null', () => {
      const auth = crearAuthService();
      expect(auth.getId()).toBeNull();
      expect(auth.getEmail()).toBeNull();
      expect(auth.getNombre()).toBeNull();
      expect(auth.getRol()).toBeNull();
    });
  });
});
