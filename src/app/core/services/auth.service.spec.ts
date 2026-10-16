import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user';
import {
  CLAVE_TOKEN, CLAVE_USUARIO, ESTUDIANTE_PRUEBA, DOCENTE_PRUEBA,
  cerrarSesionDePrueba, crearTokenDePrueba, crearUsuarioDe,
  iniciarSesionCorrupta, iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import { CLAVE_PRUEBA, crearLoginRequest, crearRegistroUsuario } from '../../../testing/datos-de-prueba.helper';
import {
  peticion, providersDePrueba, responder, responderError,
} from '../../../testing/http-de-prueba.helper';

describe('AuthService', () => {
  let http: HttpTestingController;

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
    it('sin sesión guardada -> no autenticado', () => {
      const auth = crearAuthService();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.currentUser()).toBeNull();
      expect(auth.userRole()).toBeNull();
    });

    it('con sesión guardada -> restaura token y usuario', () => {
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);
      const auth = crearAuthService();
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.currentUser()).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
      expect(auth.userRole()).toBe(Role.ESTUDIANTE);
    });

    it('con usuario corrupto en storage -> lo borra y no autentica', () => {
      iniciarSesionCorrupta();
      const auth = crearAuthService();
      expect(auth.currentUser()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
    });
  });

  describe('login', () => {
    it('envía las credenciales y guarda la sesión', () => {
      const auth = crearAuthService();
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA);
      
      auth.login(crearLoginRequest()).subscribe();
      const req = responder(http, 'POST', '/auth/login', { token });
      
      expect(req.request.body).toEqual({ username: ESTUDIANTE_PRUEBA.username, password: CLAVE_PRUEBA });
      expect(auth.token()).toBe(token);
      expect(auth.currentUser()).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
    });
  });

  describe('registro (login automático)', () => {
    it('registrarUsuario -> POST /register/usuario y queda logueado', () => {
      const auth = crearAuthService();
      const datos = crearRegistroUsuario();
      
      auth.registrarUsuario(datos).subscribe();
      const req = responder(http, 'POST', '/auth/register/usuario', { token: crearTokenDePrueba(ESTUDIANTE_PRUEBA) });
      
      expect(req.request.body).toEqual(datos);
      expect(auth.userRole()).toBe(Role.ESTUDIANTE);
    });
  });

  describe('logout', () => {
    it('borra storage y navega a /login', () => {
      iniciarSesionDePrueba();
      const auth = crearAuthService();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      
      auth.logout();
      
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('hasRole', () => {
    it.each([
      { roles: [Role.ESTUDIANTE], esperado: true },
      { roles: [Role.ESTUDIANTE, Role.DOCENTE], esperado: true },
      { roles: [Role.ADMIN], esperado: false },
    ])('ESTUDIANTE con roles $roles -> $esperado', ({ roles, esperado }) => {
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA);
      const auth = crearAuthService();
      expect(auth.hasRole(roles)).toBe(esperado);
    });
  });
});