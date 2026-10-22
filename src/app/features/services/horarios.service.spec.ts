import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { HorarioService } from './horario.service';
import { MiHorarioDTO } from '../models/horario.model';
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
import { crearMiHorarioDTO } from '../../../testing/datos-de-prueba.helper';

describe('HorarioService', () => {
  let http: HttpTestingController;

  function crearHorarioService(): HorarioService {
    TestBed.configureTestingModule({
      providers: providersDePrueba(),
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(HorarioService);
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('obtenerMiHorario', () => {
    it('petición GET /mi-horario emite los datos del cronograma del estudiante', () => {
      // Arrange
      iniciarSesionDePrueba();
      const servicio = crearHorarioService();
      let resultado: MiHorarioDTO | undefined;

      // Act
      servicio.obtenerMiHorario().subscribe((r) => (resultado = r));
      const req = responder(http, 'GET', '/mi-horario', crearMiHorarioDTO());

      // Assert
      expect(req.request.method).toBe('GET');
      expect(resultado).toEqual(crearMiHorarioDTO());
    });

    it('devuelve lista vacía de clases cuando es fin de semana o feriado', () => {
      iniciarSesionDePrueba();
      const servicio = crearHorarioService();
      let resultado: MiHorarioDTO | undefined;
      const horarioVacio = crearMiHorarioDTO({ dia: null, mensaje: 'Fin de semana', clases: [] });

      servicio.obtenerMiHorario().subscribe((r) => (resultado = r));
      responder(http, 'GET', '/mi-horario', horarioVacio);

      expect(resultado?.clases).toEqual([]);
      expect(resultado?.dia).toBeNull();
    });

    it.each([
      { status: 401 },
      { status: 403 },
      { status: 404 },
      { status: 500 },
    ])('backend $status propaga el error HTTP', ({ status }) => {
      iniciarSesionDePrueba();
      const servicio = crearHorarioService();
      let errorRecibido: any;

      servicio.obtenerMiHorario().subscribe({
        error: (err) => (errorRecibido = err),
      });
      responderError(http, 'GET', '/mi-horario', status);

      expect(errorRecibido.status).toBe(status);
    });

    it('sin conexión propaga status 0', () => {
      iniciarSesionDePrueba();
      const servicio = crearHorarioService();
      let errorRecibido: any;

      servicio.obtenerMiHorario().subscribe({
        error: (err) => (errorRecibido = err),
      });
      responderSinConexion(http, 'GET', '/mi-horario');

      expect(errorRecibido.status).toBe(0);
    });
  });
});