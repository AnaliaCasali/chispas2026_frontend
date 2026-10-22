import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { InicioComponent } from './inicio';
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
  crearInicioDTO,
  crearMateriaInicioDTO,
  crearActividadCarpetaDTO,
} from '../../../../testing/datos-de-prueba.helper';
import { clic, textoVisible, existeBoton } from '../../../../testing/dom.helper';

describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: providersDePrueba([], [
        { path: 'horarios', children: [] },
        { path: 'mi-carpeta', children: [] },
        { path: 'actividades/:id', children: [] },
        { path: 'mi-carpeta/materias/:id/actividades', children: [] },
      ]),
    });

    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(InicioComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('Carga inicial y escenarios de visualización', () => {
    it('estudiante con clase en curso y actividad muestra tarjeta destacada y datos de tarea', async () => {
      // Arrange
      iniciarSesionDePrueba();
      await crear();

      // Act
      responder(
        http,
        'GET',
        '/inicio',
        crearInicioDTO({
          hayClaseAhora: true,
          materias: [
            crearMateriaInicioDTO({
              nombre: 'Lengua y Literatura',
              actividadPrincipal: crearActividadCarpetaDTO({
                titulo: 'Lectura comprensiva: Capítulo 3',
                estado: 'PENDIENTE',
              }),
            }),
          ],
        })
      );
      await fixture.whenStable();

      // Assert
      expect(textoVisible(dom())).toContain('CARPETA DIGITAL');
      expect(textoVisible(dom())).toContain('AHORA:');
      expect(textoVisible(dom())).toContain('Lengua y Literatura');
      expect(textoVisible(dom())).toContain('Lectura comprensiva: Capítulo 3');
      expect(textoVisible(dom())).toContain('PENDIENTE');
      expect(existeBoton(dom(), 'ABRIR CLASE')).toBe(true);
    });

    it('estudiante con clase en curso sin actividad muestra mensaje por defecto', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/inicio',
        crearInicioDTO({
          hayClaseAhora: true,
          materias: [
            crearMateriaInicioDTO({
              nombre: 'Matemática',
              actividadPrincipal: null,
              mensaje: 'Repaso libre para el examen',
            }),
          ],
        })
      );
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('AHORA:');
      expect(textoVisible(dom())).toContain('Matemática');
      expect(textoVisible(dom())).toContain('Repaso libre para el examen');
      expect(existeBoton(dom(), 'ABRIR CLASE')).toBe(true);
    });

    it('estudiante sin clase en curso muestra alerta con mensaje informativo', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/inicio',
        crearInicioDTO({
          hayClaseAhora: false,
          mensaje: 'No hay clases en curso en este momento.',
          materias: [],
        })
      );
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No hay clases en curso en este momento.');
      expect(existeBoton(dom(), 'ABRIR CLASE')).toBe(false);
      expect(existeBoton(dom(), 'Ver Horarios')).toBe(true);
      expect(existeBoton(dom(), 'Mis Materias')).toBe(true);
    });
  });

  describe('Navegación desde los botones de acción', () => {
    it('clic en ABRIR CLASE con actividad principal navega directo a la actividad', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/inicio',
        crearInicioDTO({
          hayClaseAhora: true,
          materias: [
            crearMateriaInicioDTO({
              actividadPrincipal: crearActividadCarpetaDTO({ actividadId: 505 }),
            }),
          ],
        })
      );
      await fixture.whenStable();

      await clic(fixture, 'ABRIR CLASE');

      expect(navigate).toHaveBeenCalledWith(['/actividades', 505]);
    });

    it('clic en ABRIR CLASE sin actividad principal navega a las actividades de la materia', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/inicio',
        crearInicioDTO({
          hayClaseAhora: true,
          materias: [
            crearMateriaInicioDTO({
              carpetaEspacioId: 88,
              actividadPrincipal: null,
            }),
          ],
        })
      );
      await fixture.whenStable();

      await clic(fixture, 'ABRIR CLASE');

      expect(navigate).toHaveBeenCalledWith(['/mi-carpeta/materias', 88, 'actividades']);
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
      await crear();

      responderError(http, 'GET', '/inicio', status);
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No se pudo conectar con el servidor.');
      expect(existeBoton(dom(), 'Reintentar')).toBe(true);

      // Act: el usuario presiona "Reintentar"
      await clic(fixture, 'Reintentar');
      responder(http, 'GET', '/inicio', crearInicioDTO());
      await fixture.whenStable();

      // Assert
      expect(textoVisible(dom())).toContain('AHORA:');
      expect(existeBoton(dom(), 'Reintentar')).toBe(false);
    });

    it('sin conexión muestra mensaje de error y permite recuperar tras reintento', async () => {
      iniciarSesionDePrueba();
      await crear();

      responderSinConexion(http, 'GET', '/inicio');
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No se pudo conectar con el servidor.');
      expect(existeBoton(dom(), 'Reintentar')).toBe(true);

      await clic(fixture, 'Reintentar');
      responder(http, 'GET', '/inicio', crearInicioDTO());
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('AHORA:');
    });
  });
});