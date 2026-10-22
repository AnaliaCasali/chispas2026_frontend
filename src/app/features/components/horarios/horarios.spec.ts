import { describe, it, expect, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { HorariosComponent } from './horarios';
import { providersDePrueba, responder, responderError, responderSinConexion } from '../../../../testing/http-de-prueba.helper';
import { iniciarSesionDePrueba, cerrarSesionDePrueba } from '../../../../testing/sesion-de-prueba.helper';
import { crearMiHorarioDTO, crearClaseHorarioDTO } from '../../../../testing/datos-de-prueba.helper';
import { clic, textoVisible, existeBoton } from '../../../../testing/dom.helper';

describe('HorariosComponent', () => {
  let fixture: ComponentFixture<HorariosComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [HorariosComponent],
      providers: providersDePrueba([], [
        { path: 'mi-carpeta/materias/:id', children: [] }
      ]),
    });

    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(HorariosComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('Carga inicial y renderizado', () => {
    it('estudiante con clases de hoy muestra lista formateada y badge en curso', async () => {
      // Arrange
      iniciarSesionDePrueba();
      await crear();

      // Act
      responder(http, 'GET', '/mi-horario', crearMiHorarioDTO());
      await fixture.whenStable();

      // Assert
      expect(textoVisible(dom())).toContain('HOY (LUNES)');
      expect(textoVisible(dom())).toContain('Lengua y Literatura');
      expect(textoVisible(dom())).toContain('08:45 a 09:30');
      expect(textoVisible(dom())).toContain('EN CURSO');
      expect(textoVisible(dom())).toContain('Matemática');
      expect(textoVisible(dom())).toContain('09:30 a 10:15');
      expect(existeBoton(dom(), 'Reintentar')).toBe(false);
    });

    it('estudiante sin clases programadas o fin de semana muestra mensaje de descanso', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/mi-horario',
        crearMiHorarioDTO({
          dia: 'JUEVES',
          mensaje: 'Hoy no tienes clases programadas',
          clases: [],
        })
      );
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('HOY (JUEVES)');
      expect(textoVisible(dom())).toContain('Hoy no tienes clases programadas');
      expect(textoVisible(dom())).toContain('Aprovecha para descansar');
    });

    it('fin de semana con día en null muestra título de HOY sin día entre paréntesis', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/mi-horario',
        crearMiHorarioDTO({
          dia: null,
          mensaje: 'Fin de semana',
          clases: [],
        })
      );
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('HOY');
      expect(textoVisible(dom())).not.toContain('null');
      expect(textoVisible(dom())).toContain('Fin de semana');
    });
  });

  describe('Navegación al tocar una materia', () => {
    it('clic en tarjeta de materia navega al detalle de carpeta con el id', async () => {
      iniciarSesionDePrueba();
      await crear();

      responder(
        http,
        'GET',
        '/mi-horario',
        crearMiHorarioDTO({
          clases: [
            crearClaseHorarioDTO({
              carpetaEspacioId: 42,
              materia: 'Historia',
            }),
          ],
        })
      );
      await fixture.whenStable();

      const tarjeta = dom().querySelector('.tarjeta-clase') as HTMLElement;
      tarjeta.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/mi-carpeta/materias', 42]);
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

      responderError(http, 'GET', '/mi-horario', status);
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No pudimos cargar los horarios');
      expect(existeBoton(dom(), 'Reintentar')).toBe(true);

      // Act: reintento
      await clic(fixture, 'Reintentar');
      responder(http, 'GET', '/mi-horario', crearMiHorarioDTO());
      await fixture.whenStable();

      // Assert
      expect(textoVisible(dom())).toContain('Lengua y Literatura');
      expect(existeBoton(dom(), 'Reintentar')).toBe(false);
    });

    it('sin conexión muestra mensaje de error y permite recuperar tras reintento', async () => {
      iniciarSesionDePrueba();
      await crear();

      responderSinConexion(http, 'GET', '/mi-horario');
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('No pudimos cargar los horarios');
      expect(existeBoton(dom(), 'Reintentar')).toBe(true);

      await clic(fixture, 'Reintentar');
      responder(http, 'GET', '/mi-horario', crearMiHorarioDTO());
      await fixture.whenStable();

      expect(textoVisible(dom())).toContain('Lengua y Literatura');
    });
  });
});