import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { InicioService } from './inicio.service';
import { InicioDTO } from '../models/inicio.model';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
} from '../../../testing/http-de-prueba.helper';
import {
  cerrarSesionDePrueba,
  iniciarSesionDePrueba,
} from '../../../testing/sesion-de-prueba.helper';
import { crearInicioDTO } from '../../../testing/datos-de-prueba.helper';

describe('InicioService', () => {
  let http: HttpTestingController;

  function crearInicioService(): InicioService {
    TestBed.configureTestingModule({
      providers: providersDePrueba(),
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(InicioService);
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('obtenerInicio', () => {
    it('petición GET /inicio emite los datos del estado escolar actual', () => {
      // Arrange
      iniciarSesionDePrueba();
      const servicio = crearInicioService();
      let resultado: InicioDTO | undefined;

      // Act
      servicio.obtenerInicio().subscribe((r) => (resultado = r));
      const req = responder(http, 'GET', '/inicio', crearInicioDTO());

      // Assert
      expect(req.request.method).toBe('GET');
      expect(resultado).toEqual(crearInicioDTO());
    });

    it('devuelve cronograma sin clases en curso cuando hayClaseAhora es false', () => {
      iniciarSesionDePrueba();
      const servicio = crearInicioService();
      let resultado: InicioDTO | undefined;
      const inicioSinClases = crearInicioDTO({
        hayClaseAhora: false,
        mensaje: 'No hay clases en curso en este momento.',
        materias: [],
      });

      servicio.obtenerInicio().subscribe((r) => (resultado = r));
      responder(http, 'GET', '/inicio', inicioSinClases);

      expect(resultado?.hayClaseAhora).toBe(false);
      expect(resultado?.materias).toEqual([]);
      expect(resultado?.mensaje).toBe('No hay clases en curso en este momento.');
    });

    it.each([
      { status: 401 },
      { status: 403 },
      { status: 404 },
      { status: 500 },
    ])('backend $status propaga el error HTTP al suscriptor', ({ status }) => {
      iniciarSesionDePrueba();
      const servicio = crearInicioService();
      let errorRecibido: any;

      servicio.obtenerInicio().subscribe({
        error: (err) => (errorRecibido = err),
      });
      responderError(http, 'GET', '/inicio', status);

      expect(errorRecibido.status).toBe(status);
    });

    it('sin conexión propaga status 0', () => {
      iniciarSesionDePrueba();
      const servicio = crearInicioService();
      let errorRecibido: any;

      servicio.obtenerInicio().subscribe({
        error: (err) => (errorRecibido = err),
      });
      responderSinConexion(http, 'GET', '/inicio');

      expect(errorRecibido.status).toBe(0);
    });
  });
});