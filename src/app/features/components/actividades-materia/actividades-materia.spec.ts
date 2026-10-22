import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ActividadesMateriaComponent } from './actividades-materia';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
} from '../../../../testing/http-de-prueba.helper';
import {
  iniciarSesionDePrueba,
  cerrarSesionDePrueba,
} from '../../../../testing/sesion-de-prueba.helper';
import {
  crearActividadesMateriaDTO,
  crearHistorialTareaDTO,
  crearActividadCarpetaDTO,
} from '../../../../testing/datos-de-prueba.helper';
import { clic, textoVisible, existeBoton } from '../../../../testing/dom.helper';

describe('ActividadesMateriaComponent', () => {
  let fixture: ComponentFixture<ActividadesMateriaComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(idRuta = '1'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ActividadesMateriaComponent],
      providers: [
        ...providersDePrueba([], [
          { path: 'mi-carpeta', children: [] },
          { path: 'actividad/ordenar/:tareaId', children: [] },
          { path: 'actividad/unir-con-flechas/:tareaId', children: [] },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? idRuta : null),
              },
            },
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ActividadesMateriaComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('Carga inicial y renderizado', () => {
    it('materia con tareas pendientes y realizadas muestra título, pestañas y listado', async () => {
      // Arrange
      iniciarSesionDePrueba();
      await crear('1');

      // Act
      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      // Assert
      expect(textoVisible(dom())).toContain('Lengua y Literatura');
      expect(textoVisible(dom())).toContain('Todas (2)');
      expect(textoVisible(dom())).toContain('Pendientes (1)');
      expect(textoVisible(dom())).toContain('Realizadas (1)');
      expect(textoVisible(dom())).toContain('Ordenar Don Quijote');
      expect(textoVisible(dom())).toContain('Unir con Flechas Quijote');
    });

    it('materia sin tareas muestra mensaje informativo de estado vacío', async () => {
      iniciarSesionDePrueba();
      await crear('5');

      responder(
        http,
        'GET',
        '/materias/5/actividades',
        crearActividadesMateriaDTO({
          actividades: [],
          mensaje: 'No hay actividades para esta materia aún.',
        })
      );
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No hay actividades para esta materia aún.');
      expect(dom().querySelector('.barra-filtros')).toBeNull();
    });
  });

  describe('Filtros de tareas (Pestañas)', () => {
    it('al seleccionar pestaña Pendientes solo muestra las tareas no realizadas', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      await clic(fixture, 'Pendientes (1)');

      expect(textoVisible(dom())).toContain('Ordenar Don Quijote');
      expect(textoVisible(dom())).not.toContain('Unir con Flechas Quijote');
    });

    it('al seleccionar pestaña Realizadas solo muestra las tareas completadas', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      await clic(fixture, 'Realizadas (1)');

      expect(textoVisible(dom())).not.toContain('Ordenar Don Quijote');
      expect(textoVisible(dom())).toContain('Unir con Flechas Quijote');
    });

    it('al no haber realizadas y filtrar por Realizadas muestra mensaje amigable', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO({
          actividades: [
            crearActividadCarpetaDTO({
              tareaId: 10,
              titulo: 'Tarea 1',
              realizada: false,
            }),
          ],
        })
      );
      await fixture.whenStable();

      await clic(fixture, 'Realizadas (0)');

      expect(textoVisible(dom())).toContain('Todavía no has realizado ninguna actividad en esta materia.');
    });
  });

  describe('Navegación al interactuar con las tarjetas', () => {
    it('clic en tarea pendiente con plantilla ORDENAR navega a /actividad/ordenar/:id', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      const tarjetas = dom().querySelectorAll('.tarjeta-tarea');
      (tarjetas[0] as HTMLElement).click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/actividad/ordenar', 10], {
        state: { materiaNombre: 'Lengua y Literatura' },
      });
    });

    it('clic en tarea pendiente con plantilla UNIR_FLECHAS navega a /actividad/unir-con-flechas/:id', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO({
          actividades: [
            crearActividadCarpetaDTO({
              tareaId: 77,
              titulo: 'Unir Parejas',
              realizada: false,
              tipoActividad: { id: 2, nombre: 'Unir', codigo: 'UNIR_FLECHAS' },
            }),
          ],
        })
      );
      await fixture.whenStable();

      const tarjeta = dom().querySelector('.tarjeta-tarea') as HTMLElement;
      tarjeta.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/actividad/unir-con-flechas', 77], {
        state: { materiaNombre: 'Lengua y Literatura' },
      });
    });
  });

  describe('Modal de historial para tareas realizadas', () => {
    it('clic en tarea realizada abre el modal de historial y consulta el resultado al backend', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      // Clic en la segunda tarea (realizada)
      const tarjetas = dom().querySelectorAll('.tarjeta-tarea');
      (tarjetas[1] as HTMLElement).click();
      await fixture.whenStable();

      // Petición al endpoint de resultado de la tarea
      responder(http, 'GET', '/tareas/20/resultado', crearHistorialTareaDTO());
      await fixture.whenStable();

      expect(dom().querySelector('.modal-backdrop')).not.toBeNull();
      expect(textoVisible(dom())).toContain('¡Actividad Realizada!');
      expect(textoVisible(dom())).toContain('4 / 4');
      expect(textoVisible(dom())).toContain('¡Excelente trabajo!');
      expect(textoVisible(dom())).toContain('Intento 1');

      // Act: cerrar el modal
      await clic(fixture, 'Volver a la carpeta');

      // Assert: se oculta el modal
      expect(dom().querySelector('.modal-backdrop')).toBeNull();
    });
  });

  describe('Manejo de errores HTTP y reintento', () => {
    it.each([
      { status: 401 },
      { status: 403 },
      { status: 404 },
      { status: 500 },
    ])('backend $status muestra mensaje de error y permite reintentar', async ({ status }) => {
      iniciarSesionDePrueba();
      await crear('1');

      responderError(http, 'GET', '/materias/1/actividades', status);
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No pudimos cargar las tareas');
      expect(existeBoton(dom(), 'Reintentar')).toBe(true);

      // Act: reintento
      await clic(fixture, 'Reintentar');
      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      // Assert
      expect(textoVisible(dom())).toContain('Lengua y Literatura');
      expect(existeBoton(dom(), 'Reintentar')).toBe(false);
    });

    it('sin conexión muestra mensaje de error y permite recuperar tras reintento', async () => {
      iniciarSesionDePrueba();
      await crear('1');

      responderSinConexion(http, 'GET', '/materias/1/actividades');
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No pudimos cargar las tareas');
      expect(existeBoton(dom(), 'Reintentar')).toBe(true);

      await clic(fixture, 'Reintentar');
      responder(
        http,
        'GET',
        '/materias/1/actividades',
        crearActividadesMateriaDTO()
      );
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('Lengua y Literatura');
    });
  });
});