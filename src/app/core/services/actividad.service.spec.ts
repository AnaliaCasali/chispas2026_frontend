import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActividadService, ResultadoTareaDTO } from './actividad.service';
import {
  crearEntregaRequestDto,
  crearItemRespuestaDto,
  crearResultadoTareaDto,
} from '../../../testing/datos-de-prueba.helper';
import { cerrarSesionDePrueba } from '../../../testing/sesion-de-prueba.helper';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
} from '../../../testing/http-de-prueba.helper';

describe('ActividadService', () => {
  let http: HttpTestingController;

  /** Crea el service con los providers zoneless de testing. */
  function crearActividadService(): ActividadService {
    TestBed.configureTestingModule({ providers: providersDePrueba() });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(ActividadService);
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('entregarTarea', () => {
    it('entrega con respuestas válida → envía POST a /tareas/:id/entrega con body y emite ResultadoTareaDTO', () => {
      // Arrange
      const servicio = crearActividadService();
      const tareaId = 15;
      const entrega = crearEntregaRequestDto();
      const respuestaEsperada = crearResultadoTareaDto({ tareaId });
      let resultado: ResultadoTareaDTO | undefined;

      // Act
      servicio.entregarTarea(tareaId, entrega).subscribe((res) => (resultado = res));
      const req = responder(http, 'POST', `/tareas/${tareaId}/entrega`, respuestaEsperada);

      // Assert
      expect(req.request.body).toEqual(entrega);
      expect(resultado).toEqual(respuestaEsperada);
    });

    it('entrega con lista de items vacía (items: []) → envía POST con array vacío y procesa respuesta', () => {
      // Arrange
      const servicio = crearActividadService();
      const tareaId = 20;
      const entregaVacia = crearEntregaRequestDto({ items: [] });
      const respuesta = crearResultadoTareaDto({
        tareaId,
        aciertos: 0,
        totalItems: 0,
        estado: 'Pendiente',
        puedeIntentar: true,
      });
      let resultado: ResultadoTareaDTO | undefined;

      // Act
      servicio.entregarTarea(tareaId, entregaVacia).subscribe((res) => (resultado = res));
      const req = responder(http, 'POST', `/tareas/${tareaId}/entrega`, respuesta);

      // Assert
      expect(req.request.body.items).toEqual([]);
      expect(resultado?.aciertos).toBe(0);
      expect(resultado?.totalItems).toBe(0);
    });

    it('items con campos opcionales en null → envía DTO conservando valores nulos', () => {
      // Arrange
      const servicio = crearActividadService();
      const tareaId = 5;
      const itemConNulos = crearItemRespuestaDto({
        itemId: 50,
        posicionElegida: null,
        itemUnidoId: null,
      });
      const entrega = crearEntregaRequestDto({ items: [itemConNulos] });

      // Act
      servicio.entregarTarea(tareaId, entrega).subscribe();
      const req = responder(http, 'POST', `/tareas/${tareaId}/entrega`, crearResultadoTareaDto({ tareaId }));

      // Assert
      expect(req.request.body.items[0].posicionElegida).toBeNull();
      expect(req.request.body.items[0].itemUnidoId).toBeNull();
    });

    it('resultado con puedeIntentar en false y estado Realizada → emite DTO sin reintentos disponibles', () => {
      // Arrange
      const servicio = crearActividadService();
      const tareaId = 10;
      const respuesta = crearResultadoTareaDto({
        tareaId,
        estado: 'Realizada',
        puedeIntentar: false,
        aciertos: 3,
        totalItems: 3,
      });
      let resultado: ResultadoTareaDTO | undefined;

      // Act
      servicio.entregarTarea(tareaId, crearEntregaRequestDto()).subscribe((res) => (resultado = res));
      responder(http, 'POST', `/tareas/${tareaId}/entrega`, respuesta);

      // Assert
      expect(resultado?.puedeIntentar).toBe(false);
      expect(resultado?.estado).toBe('Realizada');
      expect(resultado?.aciertos).toBe(3);
    });

    it.each([
      { status: 400, desc: 'datos de entrega malformados' },
      { status: 401, desc: 'estudiante no autenticado' },
      { status: 404, desc: 'tarea inexistente' },
      { status: 409, desc: 'tarea ya entregada sin intentos permitidos' },
      { status: 500, desc: 'error interno al evaluar la tarea' },
    ])('backend responde error $status ($desc) → propaga HttpErrorResponse al suscriptor', ({ status }) => {
      // Arrange
      const servicio = crearActividadService();
      const tareaId = 99;
      let errorStatus: number | undefined;

      // Act
      servicio.entregarTarea(tareaId, crearEntregaRequestDto()).subscribe({
        error: (err: HttpErrorResponse) => (errorStatus = err.status),
      });
      responderError(http, 'POST', `/tareas/${tareaId}/entrega`, status);

      // Assert
      expect(errorStatus).toBe(status);
    });

    it('sin conexión con el backend (status 0) → propaga error de conexión', () => {
      // Arrange
      const servicio = crearActividadService();
      const tareaId = 1;
      let errorCapturado: HttpErrorResponse | undefined;

      // Act
      servicio.entregarTarea(tareaId, crearEntregaRequestDto()).subscribe({
        error: (err: HttpErrorResponse) => (errorCapturado = err),
      });
      responderSinConexion(http, 'POST', `/tareas/${tareaId}/entrega`);

      // Assert
      expect(errorCapturado).toBeDefined();
      expect(errorCapturado?.status).toBe(0);
    });
  });
});