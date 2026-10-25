import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ActividadUnirComponent } from './actividad-unir';
import {
  providersDePrueba,
  responder,
  responderError,
  responderSinConexion,
  sinPeticiones,
} from '../../../../testing/http-de-prueba.helper';
import { cerrarSesionDePrueba } from '../../../../testing/sesion-de-prueba.helper';
import {
  crearHistorialTareaDto,
  crearResultadoTareaDto,
  crearTareaDetalleDto,
  crearItemsActividadDto,
} from '../../../../testing/datos-de-prueba.helper';
import { clic, elementoPorTexto, existeBoton, textoVisible } from '../../../../testing/dom.helper';

describe('ActividadUnirComponent', () => {
  let fixture: ComponentFixture<ActividadUnirComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let locationBack: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(
    tareaId = 2,
    detalle = crearTareaDetalleDto({
      tareaId,
      tipoActividad: { codigo: 'UNIR_FLECHAS', nombre: 'Unir con flechas' },
      items: crearItemsActividadDto('UNIR_FLECHAS'),
    }),
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ActividadUnirComponent],
      providers: [
        providersDePrueba(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => (k === 'tareaId' ? tareaId.toString() : null) },
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    locationBack = vi.spyOn(TestBed.inject(Location), 'back');

    fixture = TestBed.createComponent(ActividadUnirComponent);
    await fixture.whenStable();

    if (tareaId) {
      responder(http, 'GET', `/tareas/${tareaId}`, detalle);
      await fixture.whenStable();
    }
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /** Helper para conectar las 4 parejas de izquierda y derecha */
  async function unirTodasLasParejas(): Promise<void> {
    const pares = [
      { izqId: 10, textoDer: 'Don Quijote lee un libro' },
      { izqId: 11, textoDer: 'Don Quijote sale de casa' },
      { izqId: 12, textoDer: 'Don Quijote ve un molino' },
      { izqId: 13, textoDer: 'Don Quijote vuelve a casa' },
    ];
    for (const p of pares) {
      const dotIzq = dom().querySelector(`#dot-izq-${p.izqId}`)?.parentElement as HTMLElement;
      dotIzq.click();
      await fixture.whenStable();

      elementoPorTexto(dom(), p.textoDer).click();
      await fixture.whenStable();
    }
  }

  it('carga dinámicamente del backend todas las imágenes (IZQ) y frases (DER), ordenadas por posición', async () => {
    const items = crearItemsActividadDto('UNIR_FLECHAS').reverse();
    await crear(2, crearTareaDetalleDto({
      tareaId: 2,
      tipoActividad: { codigo: 'UNIR_FLECHAS', nombre: 'Unir con flechas' },
      items,
    }));

    const imgs = Array.from(dom().querySelectorAll('.columna-izq img')) as HTMLImageElement[];
    expect(imgs.map(i => i.getAttribute('src'))).toEqual([
      'http://localhost:8080/images/img10.webp',
      'http://localhost:8080/images/img11.webp',
      'http://localhost:8080/images/img12.webp',
      'http://localhost:8080/images/img13.webp',
    ]);
    expect(imgs.map(i => i.alt)).toEqual([
      'Don Quijote lee un libro',
      'Don Quijote sale de casa',
      'Don Quijote ve un molino',
      'Don Quijote vuelve a casa',
    ]);
    const frases = Array.from(dom().querySelectorAll('.columna-der .texto-accion')).map(p => p.textContent?.trim());
    expect(frases).toEqual([
      'Don Quijote sale de casa',
      'Don Quijote ve un molino',
      'Don Quijote lee un libro',
      'Don Quijote vuelve a casa',
    ]);
    expect(fixture.componentInstance.totalItems()).toBe(4);
  });

  it('ngOnInit con tareaId pendiente → solicita detalle al backend, lee consigna y muestra ambas columnas', async () => {
    const speakSpy = vi.fn();
    Object.assign(window, {
      speechSynthesis: { cancel: vi.fn(), speak: speakSpy },
      SpeechSynthesisUtterance: class {
        lang = '';
        rate = 1;
        constructor(public text: string) {}
      },
    });

    await crear(2);

    expect(textoVisible(dom())).toContain('Don Quijote sale de casa');
    expect(textoVisible(dom())).toContain('Don Quijote ve un molino');
    expect(textoVisible(dom())).toContain('TERMINAR');
    expect(speakSpy).toHaveBeenCalled();

    // Click en botón Escuchar consigna
    speakSpy.mockClear();
    const btnEscuchar = dom().querySelector('button.btn-escuchar-consigna') as HTMLButtonElement;
    btnEscuchar.click();
    await fixture.whenStable();
    expect(speakSpy).toHaveBeenCalled();
  });

  it('click en TERMINAR sin unir todas las parejas → muestra mensaje de aviso y NO envía petición', async () => {
    await crear(2);

    await clic(fixture, 'TERMINAR');

    expect(textoVisible(dom())).toContain('¡Casi listo! Une las 4 imágenes con sus frases para ver tu resultado.');
    sinPeticiones(http, '/entrega');
  });

  it('todas las parejas unidas (4/4) → envía POST /tareas/:id/entrega, guarda datos, muestra felicitaciones y oculta VOLVER A INTENTAR', async () => {
    await crear(2);
    await unirTodasLasParejas();

    await clic(fixture, 'TERMINAR');
    const req = responder(
      http,
      'POST',
      '/tareas/2/entrega',
      crearResultadoTareaDto({ tareaId: 2, aciertos: 4, totalItems: 4 }),
    );
    await fixture.whenStable();

    expect(req.request.body).toEqual({
      items: [
        { itemId: 10, itemUnidoId: 103, posicionElegida: null },
        { itemId: 11, itemUnidoId: 101, posicionElegida: null },
        { itemId: 12, itemUnidoId: 102, posicionElegida: null },
        { itemId: 13, itemUnidoId: 104, posicionElegida: null },
      ],
    });
    expect(textoVisible(dom())).toContain('¡Felicitaciones!');
    expect(existeBoton(dom(), 'VOLVER A INTENTAR')).toBe(false);
    expect(localStorage.getItem('chispas_hora_tarea_2')).toContain('hs');
    expect(localStorage.getItem('chispas_pares_tarea_2')).not.toBeNull();
  });

  it('tarea con realizada en true al cargar → muestra flechas resueltas en modo solo lectura, hora e intentos sin leer consigna ni mostrar TERMINAR', async () => {
    const speakSpy = vi.fn();
    Object.assign(window, {
      speechSynthesis: { cancel: vi.fn(), speak: speakSpy },
      SpeechSynthesisUtterance: class {
        lang = '';
        rate = 1;
        constructor(public text: string) {}
      },
    });
    localStorage.setItem('chispas_hora_tarea_2', '23/10/2026 a las 16:00 hs');
    localStorage.setItem(
      'chispas_pares_tarea_2',
      JSON.stringify([
        { itemId: 10, itemUnidoId: 103, posicionElegida: null },
        { itemId: 11, itemUnidoId: 101, posicionElegida: null },
        { itemId: 12, itemUnidoId: 102, posicionElegida: null },
        { itemId: 13, itemUnidoId: 104, posicionElegida: null },
      ]),
    );

    const detalleRealizada = crearTareaDetalleDto({
      tareaId: 2,
      realizada: true,
      tipoActividad: { codigo: 'UNIR_FLECHAS', nombre: 'Unir con flechas' },
      items: crearItemsActividadDto('UNIR_FLECHAS'),
    });

    await crear(2, detalleRealizada);
    responder(http, 'GET', '/tareas/2/resultado', crearHistorialTareaDto({ tareaId: 2, cantidadIntentos: 2 }));
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.actividadTerminada()).toBe(true);
    expect(comp.mostrarExito()).toBe(false);
    expect(comp.conexiones().length).toBe(4);
    expect(speakSpy).not.toHaveBeenCalled();

    expect(textoVisible(dom())).toContain('Actividad completada · Solo lectura');
    expect(textoVisible(dom())).toContain('23/10/2026 a las 16:00 hs');
    expect(textoVisible(dom())).toContain('Intentos realizados: 2');
    expect(existeBoton(dom(), 'TERMINAR')).toBe(false);
  });

  it.each([
    { status: 400, desc: 'formato inválido' },
    { status: 500, desc: 'falla interna del servidor' },
  ])('backend responde error $status al entregar → muestra alerta en pantalla', async ({ status }) => {
    await crear(2);
    await unirTodasLasParejas();

    await clic(fixture, 'TERMINAR');
    responderError(http, 'POST', '/tareas/2/entrega', status);
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('Ocurrió un error al enviar tu entrega.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('backend sin conexión (status 0) al entregar → muestra alerta de error', async () => {
    await crear(2);
    await unirTodasLasParejas();

    await clic(fixture, 'TERMINAR');
    responderSinConexion(http, 'POST', '/tareas/2/entrega');
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('Ocurrió un error al enviar tu entrega.');
  });

  it('backend responde 409 al entregar sin pares en localStorage → empareja por texto en modo lectura y usa fallback si falla historial', async () => {
    await crear(2);
    await unirTodasLasParejas();

    await clic(fixture, 'TERMINAR');
    responderError(http, 'POST', '/tareas/2/entrega', 409);
    await fixture.whenStable();

    responderError(http, 'GET', '/tareas/2/resultado', 500);
    await fixture.whenStable();

    expect(fixture.componentInstance.conexiones().length).toBe(4);
    expect(textoVisible(dom())).toContain('Actividad completada · Solo lectura');
    expect(textoVisible(dom())).toContain('Intentos realizados: 1');
    expect(existeBoton(dom(), 'TERMINAR')).toBe(false);
  });

  it('click en botón volver del encabezado → ejecuta location.back()', async () => {
    await crear(2);
    window.history.pushState({}, '', '/otra-ruta');

    const btnVolver = dom().querySelector('button.btn-volver') as HTMLButtonElement;
    btnVolver.click();
    await fixture.whenStable();

    expect(locationBack).toHaveBeenCalled();
  });

  it('click en VOLVER A INTENTAR en el modal → resetea conexiones y oculta modal', async () => {
    await crear(2);
    await unirTodasLasParejas();

    await clic(fixture, 'TERMINAR');
    responder(http, 'POST', '/tareas/2/entrega', crearResultadoTareaDto({ aciertos: 2, totalItems: 4 }));
    await fixture.whenStable();

    await clic(fixture, 'VOLVER A INTENTAR');

    expect(dom().querySelectorAll('path.linea-flecha').length).toBe(0);
  });

  it.each([
    { aciertos: 3, totalItems: 4, tituloEsperado: '¡Estuviste muy cerca!' },
    { aciertos: 1, totalItems: 4, tituloEsperado: '¡Buen intento!' },
  ])('resultado parcial ($aciertos/$totalItems) → muestra título "$tituloEsperado" y botón VOLVER A INTENTAR', async ({ aciertos, totalItems, tituloEsperado }) => {
    await crear(2);
    await unirTodasLasParejas();

    await clic(fixture, 'TERMINAR');
    responder(http, 'POST', '/tareas/2/entrega', crearResultadoTareaDto({ tareaId: 2, aciertos, totalItems }));
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain(tituloEsperado);
    expect(existeBoton(dom(), 'VOLVER A INTENTAR')).toBe(true);
  });

  it('seleccionar y deseleccionar imagen o frase, invertir orden de unión y eliminar conexión haciendo click en la flecha', async () => {
    await crear(2);
    const comp = fixture.componentInstance;

    const primeraImg = comp.imagenes[0];
    const primeraAccion = comp.acciones[0];

    comp.seleccionarImagen(primeraImg);
    expect(comp.imagenSeleccionada()).toEqual(primeraImg);
    comp.seleccionarImagen(primeraImg);
    expect(comp.imagenSeleccionada()).toBeNull();

    comp.seleccionarAccion(primeraAccion);
    expect(comp.accionSeleccionada()).toEqual(primeraAccion);
    comp.seleccionarAccion(primeraAccion);
    expect(comp.accionSeleccionada()).toBeNull();

    comp.seleccionarAccion(primeraAccion);
    comp.seleccionarImagen(primeraImg);
    await fixture.whenStable();
    expect(comp.conexiones().length).toBe(1);

    const flechaSvg = dom().querySelector('path.linea-flecha') as SVGPathElement;
    flechaSvg.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    expect(comp.conexiones().length).toBe(0);

    comp.vincular(primeraImg.id, primeraAccion.id);
    comp.actividadTerminada.set(true);
    comp.seleccionarImagen(primeraImg);
    comp.seleccionarAccion(primeraAccion);
    comp.eliminarConexion(comp.conexiones()[0]);
    expect(comp.conexiones().length).toBe(1);
  });

  it('botón de audio, síntesis de voz, resize y botón IR AL INICIO del modal → alterna audio y navega a /mi-carpeta sin historial', async () => {
    const cancelSpy = vi.fn();
    const speakSpy = vi.fn();
    Object.assign(window, {
      speechSynthesis: { cancel: cancelSpy, speak: speakSpy },
      SpeechSynthesisUtterance: class {
        lang = '';
        rate = 1;
        constructor(public text: string) {}
      },
    });

    await crear(2);
    const comp = fixture.componentInstance;

    expect(comp.esEstudiante).toBe(false);
    comp.onResizeOrScroll();
    comp.leerTexto('Lectura de prueba');
    expect(speakSpy).toHaveBeenCalled();

    const btnAudio = dom().querySelector('button.btn-audio-toggle') as HTMLButtonElement;
    btnAudio.click();
    await fixture.whenStable();
    expect(comp.audioHabilitado()).toBe(false);
    expect(cancelSpy).toHaveBeenCalled();

    await unirTodasLasParejas();
    await clic(fixture, 'TERMINAR');
    responder(http, 'POST', '/tareas/2/entrega', crearResultadoTareaDto({ tareaId: 2, aciertos: 4, totalItems: 4 }));
    await fixture.whenStable();

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    await clic(fixture, 'IR AL INICIO');
    expect(navigate).toHaveBeenCalledWith(['/mi-carpeta']);
  });

  it('error al cargar detalle en ngOnInit o ruta sin tareaId → tablero vacío y mensaje de error', async () => {
    TestBed.configureTestingModule({
      imports: [ActividadUnirComponent],
      providers: [
        providersDePrueba(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: () => '99' },
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ActividadUnirComponent);
    await fixture.whenStable();

    responderError(http, 'GET', '/tareas/99', 500);
    await fixture.whenStable();
    expect(fixture.componentInstance.imagenes.length).toBe(0);
    expect(fixture.componentInstance.acciones.length).toBe(0);
    expect(textoVisible(dom())).toContain('No se pudo cargar la actividad.');

    fixture.componentInstance['route'].snapshot.queryParamMap.get = () => null;
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.conexiones().length).toBe(0);
    expect(fixture.componentInstance.mensajeAlerta().tipo).toBe('error');
  });
});