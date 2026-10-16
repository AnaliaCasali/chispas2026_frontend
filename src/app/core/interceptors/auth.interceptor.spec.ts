import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import {
  ESTUDIANTE_PRUEBA, cerrarSesionDePrueba, crearTokenDePrueba, iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import {
  crearLoginRequest, crearRegistroUsuario
} from '../../../testing/datos-de-prueba.helper';
import { responderSinConexion } from '../../../testing/http-de-prueba.helper';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  const API = environment.apiUrl;

  beforeEach(() => {
    iniciarSesionDePrueba();
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'login', children: [] }]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ]});
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
  });

  afterEach(() => { http.verify(); cerrarSesionDePrueba(); });

  describe('header Authorization', () => {
    it('API propia → agrega el Bearer y entrega la respuesta intacta', () => {
      let recibido: unknown;
      cliente.get(`${API}/seguidos/mios`).subscribe((r) => (recibido = r)); // Act
      const req = http.expectOne(`${API}/seguidos/mios`);
      expect(req.request.headers.get('Authorization')) // Assert
        .toBe(`Bearer ${TestBed.inject(AuthService).token()}`);
      const respuesta = [crearLoginRequest(), crearRegistroUsuario()];
      req.flush(respuesta);
      expect(recibido).toEqual(respuesta);
    });

    it.each([
      { metodo: 'POST', url: '/auth/login',            body: crearLoginRequest(),     respuesta: { token: crearTokenDePrueba() } },
      { metodo: 'POST', url: '/auth/register/usuario', body: crearRegistroUsuario(),  respuesta: { token: crearTokenDePrueba() } }
    ])('endpoint público $metodo $url → NO agrega el Bearer', ({ metodo, url, body, respuesta }) => {
      cliente.request(metodo, `${API}${url}`, { body }).subscribe();
      const req = http.expectOne(`${API}${url}`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(respuesta);
    });

    it('URL externa → NO envía el token a otro dominio', () => {
      cliente.get('https://otro-sitio.com/datos').subscribe();
      const req = http.expectOne('https://otro-sitio.com/datos');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ ok: true });
    });

    it('sin sesión → sale sin Bearer', () => {
      // Arrange: AuthService todavía no se creó (se crea con la 1.ª petición), así que lee el storage vacío
      cerrarSesionDePrueba();
      // Act
      cliente.get(`${API}/seguidos/mios`).subscribe();
      const req = http.expectOne(`${API}/seguidos/mios`);
      // Assert
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([crearLoginRequest()]);
    });
  });

  describe('token vencido', () => {
    it('no sale la petición y cierra la sesión', () => {
      // Arrange: se pisa la sesión del beforeEach antes de que AuthService lea el storage
      iniciarSesionDePrueba(ESTUDIANTE_PRUEBA, -60);
      let error: Error | undefined;
      // Act
      cliente.get(`${API}/seguidos/mios`).subscribe({ error: (e) => (error = e) });
      // Assert
      http.expectNone(`${API}/seguidos/mios`);
      expect(error?.message).toContain('Sesión expirada');
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });
  });

  describe('respuesta 401 del backend', () => {
    it('401 del backend → cierra la sesión', () => {
      cliente.get(`${API}/seguidos/mios`)
        .subscribe({ error: () => {} });
      http.expectOne(`${API}/seguidos/mios`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(TestBed.inject(AuthService).isAuthenticated())
        .toBe(false);
    });

    // En estos endpoints el 401 significa contraseña incorrecta, no sesión vencida
    it.each([
      { metodo: 'POST',  url: '/auth/login',          body: crearLoginRequest() },
      { metodo: 'PATCH', url: '/auth/usuarios/cambiar-password', body: {
        currentPassword: 'Mal2026!', newPassword: 'Nueva2026!', confirmationPassword: 'Nueva2026!',
      } },
    ])('401 en $metodo $url (credenciales incorrectas) → NO cierra la sesión', ({ metodo, url, body }) => {
      cliente.request(metodo, `${API}${url}`, { body }).subscribe({ error: () => {} });
      http.expectOne(`${API}${url}`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
    });

    it('varias peticiones a la vez reciben 401 → todas fallan y la sesión se cierra una vez sin romper', () => {
      // Arrange
      const errores: number[] = [];
      // Act: dos pantallas piden lo mismo al mismo tiempo
      cliente.get(`${API}/seguidos/mios`).subscribe({ error: (e) => errores.push(e.status) });
      cliente.get(`${API}/seguidos/mios`).subscribe({ error: (e) => errores.push(e.status) });
      const reqs = http.match(`${API}/seguidos/mios`);
      reqs.forEach((r) => r.flush(null, { status: 401, statusText: 'Unauthorized' }));
      // Assert
      expect(reqs.length).toBe(2);
      expect(errores).toEqual([401, 401]);
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });
  });

  describe('otros errores → se propagan y NO cierran la sesión', () => {
    it.each([
      { status: 400, statusText: 'Bad Request',           cuerpo: { message: 'Datos inválidos' } },
      { status: 403, statusText: 'Forbidden',             cuerpo: { message: 'Acceso denegado' } },
      { status: 404, statusText: 'Not Found',             cuerpo: { message: 'No encontrado' } },
      { status: 409, statusText: 'Conflict',              cuerpo: { message: 'Ya existe' } },
      { status: 500, statusText: 'Internal Server Error', cuerpo: null },
    ])('$status $statusText', ({ status, statusText, cuerpo }) => {
      let recibido = 0;
      cliente.get(`${API}/seguidos/mios`).subscribe({ error: (e) => (recibido = e.status) });
      http.expectOne(`${API}/seguidos/mios`).flush(cuerpo, { status, statusText });
      expect(recibido).toBe(status);
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
    });

    it('sin conexión (status 0) → propaga el error y NO cierra la sesión', () => {
      let recibido = -1;
      cliente.get(`${API}/seguidos/mios`).subscribe({ error: (e) => (recibido = e.status) });
      responderSinConexion(http, 'GET', '/seguidos/mios');
      expect(recibido).toBe(0);
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
    });
  });
});
