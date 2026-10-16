import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth.service';
import { errorInterceptor } from '../../core/interceptors/error-interceptor';
import { alertas, botonPorTexto, clic, escribir } from '../../../testing/dom.helper';
import {
  providersDePrueba, responder, responderError, responderSinConexion, sinPeticiones,
} from '../../../testing/http-de-prueba.helper';
import { crearLoginRequest } from '../../../testing/datos-de-prueba.helper';
import {
  CLAVE_TOKEN, CLAVE_USUARIO, ESTUDIANTE_PRUEBA, cerrarSesionDePrueba, crearTokenDePrueba, crearUsuarioDe,
} from '../../../testing/sesion-de-prueba.helper';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: providersDePrueba([errorInterceptor]),
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();
  }

  function completarFormulario(datos = crearLoginRequest()): void {
    escribir(dom(), '#username', datos.username);
    escribir(dom(), '#password', datos.password);
  }

  async function enviarFormularioValido(): Promise<void> {
    completarFormulario();
    await clic(fixture, 'Ingresar');
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('caso feliz', () => {
    it('credenciales válidas → POST /auth/login con el body y navega a /inicio', async () => {
      await crear();
      completarFormulario();
      await clic(fixture, 'Ingresar');
      const req = responder(http, 'POST', '/auth/login', { token: crearTokenDePrueba() });
      await fixture.whenStable();
      expect(req.request.body).toEqual(crearLoginRequest());
      expect(navigateByUrl).toHaveBeenCalledWith('/inicio');
    });

    it('login exitoso → guarda token y usuario en el storage', async () => {
      await crear();
      const token = crearTokenDePrueba();
      await enviarFormularioValido();
      responder(http, 'POST', '/auth/login', { token });
      await fixture.whenStable();
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(token);
      expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO)!)).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
    });

    it('login exitoso → AuthService queda autenticado con el usuario del token', async () => {
      await crear();
      await enviarFormularioValido();
      responder(http, 'POST', '/auth/login', { token: crearTokenDePrueba() });
      await fixture.whenStable();
      expect(TestBed.inject(AuthService).currentUser()).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
    });
  });

  describe('validaciones del formulario', () => {
    it('campos vacíos → muestra ambos errores y no envía', async () => {
      await crear();
      await clic(fixture, 'Ingresar');
      expect(alertas(dom())).toEqual([
        'El usuario/DNI es obligatorio.',
        'La contraseña es obligatoria.',
      ]);
      sinPeticiones(http, '/auth/login');
    });

    it.each([
      { caso: 'usuario vacío', datos: { username: '' }, mensaje: 'El usuario/DNI es obligatorio.' },
      { caso: 'contraseña vacía', datos: { password: '' }, mensaje: 'La contraseña es obligatoria.' },
    ])('$caso → muestra "$mensaje" y no envía', async ({ datos, mensaje }) => {
      await crear();
      completarFormulario(crearLoginRequest(datos));
      await clic(fixture, 'Ingresar');
      expect(alertas(dom())).toEqual([mensaje]);
      sinPeticiones(http, '/auth/login');
    });

    it('contraseña de 6 caracteres → es válida y envía el POST', async () => {
      await crear();
      completarFormulario(crearLoginRequest({ password: '123456' }));
      await clic(fixture, 'Ingresar');
      expect(alertas(dom())).toEqual([]);
      const req = responder(http, 'POST', '/auth/login', { token: crearTokenDePrueba() });
      expect(req.request.body).toEqual(crearLoginRequest({ password: '123456' }));
    });

    it('salir de un campo vacío (touched) → el error aparece antes de enviar', async () => {
      await crear();
      escribir(dom(), '#username', '');
      await fixture.whenStable();
      expect(alertas(dom())).toEqual(['El usuario/DNI es obligatorio.']);
    });

    it('sin tocar ningún campo → no muestra errores', async () => {
      await crear();
      expect(alertas(dom())).toEqual([]);
    });

    it('corregir un campo inválido → desaparece su error', async () => {
      await crear();
      escribir(dom(), '#username', 'ab'); // Error de longitud (mínimo 4)
      await fixture.whenStable();
      expect(alertas(dom())).toEqual(['Debe tener al menos 4 caracteres.']);
      escribir(dom(), '#username', ESTUDIANTE_PRUEBA.username); // DNI válido
      await fixture.whenStable();
      expect(alertas(dom())).toEqual([]);
    });
  });

  describe('estado de carga', () => {
    it('petición pendiente → botón deshabilitado con "Autenticando..."', async () => {
      await crear();
      await enviarFormularioValido();
      expect(botonPorTexto(dom(), 'Autenticando...').disabled).toBe(true);
      responder(http, 'POST', '/auth/login', { token: crearTokenDePrueba() });
    });

    it('el backend responde → el botón vuelve a "Ingresar" habilitado', async () => {
      await crear();
      await enviarFormularioValido();
      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();
      expect(botonPorTexto(dom(), 'Ingresar').disabled).toBe(false);
    });
  });

  describe('errores del backend', () => {
    it.each([
      { status: 401, mensaje: 'Usuario/DNI o contraseña incorrectos.' },
      { status: 403, mensaje: 'Usuario/DNI o contraseña incorrectos.' },
      { status: 404, mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' },
      { status: 409, mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' },
      { status: 500, mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' },
    ])('backend $status → muestra "$mensaje" y no navega', async ({ status, mensaje }) => {
      await crear();
      await enviarFormularioValido();
      responderError(http, 'POST', '/auth/login', status);
      await fixture.whenStable();
      expect(alertas(dom())).toEqual([mensaje]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('sin conexión (status 0) → avisa que no hay conexión y no navega', async () => {
      await crear();
      await enviarFormularioValido();
      responderSinConexion(http, 'POST', '/auth/login');
      await fixture.whenStable();
      expect(alertas(dom())).toEqual(['No se pudo conectar con el servidor. Revisá tu conexión.']);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('400 con mensaje del backend → muestra ese mensaje', async () => {
      await crear();
      await enviarFormularioValido();
      responderError(http, 'POST', '/auth/login', 400, { message: 'La cuenta está deshabilitada.' });
      await fixture.whenStable();
      expect(alertas(dom())).toEqual(['La cuenta está deshabilitada.']);
    });

    it('401 en el login → no cierra sesión ni redirige a /login (son credenciales, no sesión vencida)', async () => {
      await crear();
      await enviarFormularioValido();
      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();
      expect(navigate).not.toHaveBeenCalledWith(['/login']);
    });

    it('error → no queda sesión guardada', async () => {
      await crear();
      await enviarFormularioValido();
      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });

    it('backend devuelve un token malformado → mensaje genérico, sin sesión y sin navegar', async () => {
      await crear();
      await enviarFormularioValido();
      responder(http, 'POST', '/auth/login', { token: 'no-es-jwt' });
      await fixture.whenStable();
      expect(alertas(dom())).toEqual(['Ocurrió un error inesperado. Intentá de nuevo.']);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('reintento después de un error → se borra el mensaje anterior', async () => {
      await crear();
      await enviarFormularioValido();
      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();
      await clic(fixture, 'Ingresar');
      expect(alertas(dom())).toEqual([]);
      responder(http, 'POST', '/auth/login', { token: crearTokenDePrueba() });
    });
  });
});