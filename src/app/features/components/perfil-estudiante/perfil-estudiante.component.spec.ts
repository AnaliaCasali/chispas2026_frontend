import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { PerfilEstudianteComponent } from './perfil-estudiante.component';
import { PerfilEstudiante } from '../../models/perfil-estudiante.model';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
} from '../../../../testing/http-de-prueba.helper';
import { cerrarSesionDePrueba } from '../../../../testing/sesion-de-prueba.helper';
import { clic, existeBoton, textoVisible } from '../../../../testing/dom.helper';

function crearPerfilPrueba(cambios: Partial<PerfilEstudiante> = {}): PerfilEstudiante {
  return {
    id: 1,
    nombre: 'Mariel',
    apellido: 'Linera',
    fotoUrl: null,
    curso: '3° Año A',
    condiciones: ['Hipoacusia leve', 'Dislexia'],
    mensaje: null,
    observaciones: 'Prefiere consignas visuales con apoyo de audio.',
    capacidades: [
      { area: 'Lectoescritura', pregunta: '¿Comprende textos breves?', respuesta: true },
      { area: 'Lectoescritura', pregunta: '¿Escribe en cursiva?', respuesta: false },
      { area: 'Autonomía', pregunta: '¿Trabaja de forma independiente?', respuesta: true },
    ],
    ...cambios,
  };
}

describe('PerfilEstudianteComponent', () => {
  let fixture: ComponentFixture<PerfilEstudianteComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [PerfilEstudianteComponent],
      providers: providersDePrueba([errorInterceptor]),
    });

    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PerfilEstudianteComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  it('mientras espera la respuesta del backend → muestra estado de carga e iniciales vacías', async () => {
    await crear();

    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.componentInstance.iniciales()).toBe('');
    expect(textoVisible(dom())).toContain('Cargando tu perfil...');

    responder(http, 'GET', '/estudiantes/mi-perfil', crearPerfilPrueba());
    await fixture.whenStable();
  });

  it('perfil completo sin foto → muestra iniciales, curso, condiciones, observaciones y capacidades agrupadas por área', async () => {
    await crear();

    responder(http, 'GET', '/estudiantes/mi-perfil', crearPerfilPrueba());
    await fixture.whenStable();

    const texto = textoVisible(dom());
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.componentInstance.iniciales()).toBe('ML');
    expect(dom().querySelector('.avatar-iniciales')?.textContent?.trim()).toBe('ML');
    expect(texto).toContain('Mariel Linera');
    expect(texto).toContain('3° Año A');
    expect(texto).toContain('Hipoacusia leve');
    expect(texto).toContain('Dislexia');
    expect(texto).toContain('Prefiere consignas visuales con apoyo de audio.');
    expect(texto).toContain('Lectoescritura');
    expect(texto).toContain('¿Comprende textos breves?');
    expect(texto).toContain('¿Escribe en cursiva?');
    expect(texto).toContain('Autonomía');
    expect(dom().querySelectorAll('.badge-respuesta.si').length).toBe(2);
    expect(dom().querySelectorAll('.badge-respuesta.no').length).toBe(1);
  });

  it('perfil con fotoUrl y campos opcionales vacíos → renderiza imagen de avatar y textos por defecto', async () => {
    await crear();

    responder(
      http,
      'GET',
      '/estudiantes/mi-perfil',
      crearPerfilPrueba({
        fotoUrl: 'http://localhost:8080/images/avatar.webp',
        curso: null,
        condiciones: [],
        mensaje: null,
        observaciones: null,
        capacidades: undefined,
      }),
    );
    await fixture.whenStable();

    const imgAvatar = dom().querySelector('img.avatar') as HTMLImageElement;
    expect(imgAvatar).not.toBeNull();
    expect(imgAvatar.src).toContain('/images/avatar.webp');

    const texto = textoVisible(dom());
    expect(texto).toContain('Sin curso asignado');
    expect(texto).toContain('Sin condición registrada');
    expect(texto).toContain('Sin observaciones');
    expect(texto).toContain('Sin capacidades registradas');
  });

  it('perfil sin condiciones pero con mensaje del backend → muestra el mensaje personalizado', async () => {
    await crear();

    responder(
      http,
      'GET',
      '/estudiantes/mi-perfil',
      crearPerfilPrueba({
        condiciones: [],
        mensaje: 'No registra diagnósticos médicos cargados.',
      }),
    );
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('No registra diagnósticos médicos cargados.');
  });

  it.each([
    { status: 403, mensajeBackend: 'No tenés permiso para ver este perfil.' },
    { status: 404, mensajeBackend: 'No se encontró el perfil del estudiante.' },
  ])('backend responde $status → muestra el mensaje específico del error', async ({ status, mensajeBackend }) => {
    await crear();

    responderError(http, 'GET', '/estudiantes/mi-perfil', status, { message: mensajeBackend });
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain(mensajeBackend);
    expect(existeBoton(dom(), 'Reintentar')).toBe(true);
  });

  it('backend responde 500 y luego se presiona Reintentar → muestra error genérico y recarga el perfil', async () => {
    await crear();

    responderError(http, 'GET', '/estudiantes/mi-perfil', 500);
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('No se pudo cargar tu perfil.');

    await clic(fixture, 'Reintentar');
    responder(http, 'GET', '/estudiantes/mi-perfil', crearPerfilPrueba());
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('Mariel Linera');
    expect(existeBoton(dom(), 'Reintentar')).toBe(false);
  });

  it('sin conexión al servidor → muestra mensaje de error genérico', async () => {
    await crear();

    responderSinConexion(http, 'GET', '/estudiantes/mi-perfil');
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('No se pudo cargar tu perfil.');
  });

  it('click en botón volver del encabezado → navega a /inicio', async () => {
    await crear();
    responder(http, 'GET', '/estudiantes/mi-perfil', crearPerfilPrueba());
    await fixture.whenStable();

    const btnVolver = dom().querySelector('button.btn-volver') as HTMLButtonElement;
    btnVolver.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/inicio']);
  });
});