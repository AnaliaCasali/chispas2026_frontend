import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth.service';
import { errorInterceptor } from '../../core/interceptors/error-interceptor';
import {
  alertas,
  botonPorTexto,
  clic,
  escribir,
  textoVisible,
} from '../../../testing/dom.helper';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
  sinPeticiones,
} from '../../../testing/http-de-prueba.helper';
import {
  crearAuthResponse,
  crearLoginRequest,
} from '../../../testing/datos-de-prueba.helper';
import {
  CLAVE_TOKEN,
  CLAVE_USUARIO,
  ESTUDIANTE_PRUEBA,
  cerrarSesionDePrueba,
  crearTokenDePrueba,
  crearUsuarioDe,
} from '../../../testing/sesion-de-prueba.helper';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(returnUrl: string | null = null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        providersDePrueba([errorInterceptor]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'returnUrl' ? returnUrl : null),
              },
            },
          },
        },
      ],
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
    await clic(fixture, 'INGRESAR');
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('caso feliz y navegación', () => {
    it('credenciales válidas → envía POST /auth/login con el body y navega a /inicio', async () => {
      // Arrange
      await crear();
      completarFormulario();

      // Act
      await clic(fixture, 'INGRESAR');
      const req = responder(http, 'POST', '/auth/login', crearAuthResponse());
      await fixture.whenStable();

      // Assert
      expect(req.request.body).toEqual(crearLoginRequest());
      expect(navigateByUrl).toHaveBeenCalledWith('/inicio');
    });

    it('login con returnUrl relativa válida → navega a la URL especificada', async () => {
      await crear('/mi-carpeta/materias/3/actividades');
      await enviarFormularioValido();

      responder(http, 'POST', '/auth/login', crearAuthResponse());
      await fixture.whenStable();

      expect(navigateByUrl).toHaveBeenCalledWith('/mi-carpeta/materias/3/actividades');
    });

    it('login con returnUrl maliciosa que empieza con "//" → ignora y navega a /inicio', async () => {
      await crear('//sitio-malicioso.com');
      await enviarFormularioValido();

      responder(http, 'POST', '/auth/login', crearAuthResponse());
      await fixture.whenStable();

      expect(navigateByUrl).toHaveBeenCalledWith('/inicio');
    });

    it('login exitoso → almacena el token y el usuario en el localStorage', async () => {
      await crear();
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA);
      await enviarFormularioValido();

      responder(http, 'POST', '/auth/login', crearAuthResponse({ token }));
      await fixture.whenStable();

      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(token);
      expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO)!)).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
    });

    it('login exitoso → AuthService actualiza su signal currentUser con el usuario del token', async () => {
      await crear();
      await enviarFormularioValido();

      responder(http, 'POST', '/auth/login', crearAuthResponse());
      await fixture.whenStable();

      const authService = TestBed.inject(AuthService);
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.currentUser()).toEqual(crearUsuarioDe(ESTUDIANTE_PRUEBA));
    });
  });

  describe('validaciones del formulario', () => {
    it('campos vacíos y click en INGRESAR → muestra errores de validación y NO envía petición', async () => {
      await crear();

      await clic(fixture, 'INGRESAR');

      const texto = textoVisible(dom());
      expect(texto).toContain('El usuario/DNI es obligatorio.');
      expect(texto).toContain('La contraseña es obligatoria.');
      sinPeticiones(http, '/auth/login');
    });

    it.each([
      { campo: 'usuario vacío', datos: { username: '' }, mensaje: 'El usuario/DNI es obligatorio.' },
      { campo: 'contraseña vacía', datos: { password: '' }, mensaje: 'La contraseña es obligatoria.' },
    ])('$campo → muestra "$mensaje" y no envía petición', async ({ datos, mensaje }) => {
      await crear();
      completarFormulario(crearLoginRequest(datos));

      await clic(fixture, 'INGRESAR');

      expect(textoVisible(dom())).toContain(mensaje);
      sinPeticiones(http, '/auth/login');
    });

    it('usuario con menos de 4 caracteres (touched) → muestra error de longitud mínima', async () => {
      await crear();

      escribir(dom(), '#username', '123'); // 3 caracteres (mínimo 4)
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('Debe tener al menos 4 caracteres.');
    });

    it('usuario con 4 caracteres exactos (límite válido) → no muestra error de longitud', async () => {
      await crear();

      escribir(dom(), '#username', '1234');
      await fixture.whenStable();

      expect(textoVisible(dom())).not.toContain('Debe tener al menos 4 caracteres.');
    });

    it('corregir un campo inválido → el mensaje de error desaparece del template', async () => {
      await crear();

      escribir(dom(), '#username', 'abc');
      await fixture.whenStable();
      expect(textoVisible(dom())).toContain('Debe tener al menos 4 caracteres.');

      escribir(dom(), '#username', ESTUDIANTE_PRUEBA.username);
      await fixture.whenStable();
      expect(textoVisible(dom())).not.toContain('Debe tener al menos 4 caracteres.');
    });

    it('sin interactuar con el formulario → no muestra ningún mensaje de error inicial', async () => {
      await crear();

      const texto = textoVisible(dom());
      expect(texto).not.toContain('El usuario/DNI es obligatorio.');
      expect(texto).not.toContain('La contraseña es obligatoria.');
    });
  });

  describe('estado de carga', () => {
    it('petición en curso → botón muestra "Autenticando..." y está deshabilitado', async () => {
      await crear();
      await enviarFormularioValido();

      const boton = botonPorTexto(dom(), 'Autenticando...');
      expect(boton.disabled).toBe(true);

      responder(http, 'POST', '/auth/login', crearAuthResponse());
      await fixture.whenStable();
    });

    it('petición completada con error → botón vuelve a "INGRESAR" y se rehabilita', async () => {
      await crear();
      await enviarFormularioValido();

      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();

      const boton = botonPorTexto(dom(), 'INGRESAR');
      expect(boton.disabled).toBe(false);
    });
  });

  describe('errores del backend', () => {
    it.each([
      { status: 401, desc: 'credenciales inválidas', mensaje: 'Usuario/DNI o contraseña incorrectos.' },
      { status: 403, desc: 'acceso denegado', mensaje: 'Usuario/DNI o contraseña incorrectos.' },
      { status: 404, desc: 'endpoint inexistente', mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' },
      { status: 500, desc: 'error interno de servidor', mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' },
    ])('backend responde $status ($desc) → muestra "$mensaje" y no navega', async ({ status, mensaje }) => {
      await crear();
      await enviarFormularioValido();

      responderError(http, 'POST', '/auth/login', status);
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain(mensaje);
      expect(navigateByUrl).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('sin conexión con el backend (status 0) → muestra mensaje de error de conexión', async () => {
      await crear();
      await enviarFormularioValido();

      responderSinConexion(http, 'POST', '/auth/login');
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No se pudo conectar con el servidor. Revisá tu conexión.');
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('backend 400 con mensaje custom en el cuerpo → muestra ese mensaje en pantalla', async () => {
      await crear();
      await enviarFormularioValido();

      responderError(http, 'POST', '/auth/login', 400, { message: 'Tu usuario se encuentra suspendido.' });
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('Tu usuario se encuentra suspendido.');
    });

    it('error 401 en login → no redirige a /login (evita loop de autenticación)', async () => {
      await crear();
      await enviarFormularioValido();

      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();

      expect(navigate).not.toHaveBeenCalledWith(['/login']);
    });

    it('reintento tras un error → limpia el mensaje de error anterior al volver a enviar', async () => {
      await crear();
      await enviarFormularioValido();

      responderError(http, 'POST', '/auth/login', 401);
      await fixture.whenStable();
      expect(textoVisible(dom())).toContain('Usuario/DNI o contraseña incorrectos.');

      // Segundo intento
      await clic(fixture, 'INGRESAR');
      expect(textoVisible(dom())).not.toContain('Usuario/DNI o contraseña incorrectos.');

      responder(http, 'POST', '/auth/login', crearAuthResponse());
    });

    it('backend responde token JWT inválido → muestra mensaje de error y no persiste sesión', async () => {
      await crear();
      await enviarFormularioValido();

      responder(http, 'POST', '/auth/login', { token: 'jwt-roto-sin-partes' });
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('Ocurrió un error inesperado. Intentá de nuevo.');
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });
  });
});