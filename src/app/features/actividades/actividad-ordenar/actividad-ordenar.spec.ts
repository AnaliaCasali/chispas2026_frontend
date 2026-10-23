import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ActividadOrdenarComponent } from './actividad-ordenar';
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
  crearItemActividadDto,
  crearResultadoTareaDto,
  crearTareaDetalleDto,
} from '../../../../testing/datos-de-prueba.helper';
import { clic, existeBoton, textoVisible } from '../../../../testing/dom.helper';

describe('ActividadOrdenarComponent', () => {
  let fixture: ComponentFixture<ActividadOrdenarComponent>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let locationBack: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(
    tareaId = 1,
    detalle = crearTareaDetalleDto({ tareaId }),
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ActividadOrdenarComponent],
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

    fixture = TestBed.createComponent(ActividadOrdenarComponent);
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

  /** Helper para ubicar las 4 imágenes en los 4 casilleros */
  async function ubicarTodasLasImagenes(): Promise<void> {
    const disponibles = fixture.componentInstance.disponibles();
    fixture.componentInstance.casilleros.set([...disponibles]);
    fixture.componentInstance.disponibles.set([]);
    await fixture.whenStable();
  }

  it('ngOnInit con tareaId pendiente → solicita detalle al backend, lee consigna y renderiza imágenes dinámicas', async () => {
    const speakSpy = vi.fn();
    Object.assign(window, {
      speechSynthesis: { cancel: vi.fn(), speak: speakSpy },
      SpeechSynthesisUtterance: class {
        lang = '';
        rate = 1;
        constructor(public text: string) {}
      },
    });

    await crear(1);

    expect(textoVisible(dom())).toContain('Sale de su casa');
    expect(textoVisible(dom())).toContain('Don Quijote lee');
    expect(textoVisible(dom())).toContain('TERMINAR');
    expect(speakSpy).toHaveBeenCalled();

    // Click en botón Escuchar consigna
    speakSpy.mockClear();
    const btnEscuchar = dom().querySelector('button.btn-escuchar-consigna') as HTMLButtonElement;
    btnEscuchar.click();
    await fixture.whenStable();
    expect(speakSpy).toHaveBeenCalled();
  });

  it('cargarDatosBackend con campos opcionales vacíos e item sin título → conserva valores por defecto y usa textoAlt', async () => {
    const detalleMinimo = crearTareaDetalleDto({
      tareaId: 1,
      materia: { carpetaEspacioId: 1, nombre: '', color: '', icono: '' },
      contenido: { contenidoId: 1, titulo: '', texto: '', portadaUrl: '' },
      titulo: '',
      consigna: '',
      items: [crearItemActividadDto({ itemId: 1, titulo: '', textoAlt: 'Texto alternativo de prueba' })],
    });

    await crear(1, detalleMinimo);

    expect(fixture.componentInstance.materiaNombre()).toBe('LENGUA Y LITERATURA');
    expect(fixture.componentInstance.imagenesBase[0].titulo).toBe('Texto alternativo de prueba');
  });

  it('tarea con realizada en true al cargar → muestra consigna resuelta en modo solo lectura, hora e intentos sin leer consigna ni mostrar botón TERMINAR', async () => {
    const speakSpy = vi.fn();
    Object.assign(window, {
      speechSynthesis: { cancel: vi.fn(), speak: speakSpy },
      SpeechSynthesisUtterance: class {
        lang = '';
        rate = 1;
        constructor(public text: string) {}
      },
    });
    localStorage.setItem('chispas_hora_tarea_1', '23/10/2026 a las 14:30 hs');

    const detalleRealizada = crearTareaDetalleDto({ tareaId: 1, realizada: true });
    await crear(1, detalleRealizada);

    // Responde la consulta de historial de intentos disparada por cargarEstadoResuelto
    responder(http, 'GET', '/tareas/1/resultado', crearHistorialTareaDto({ cantidadIntentos: 3 }));
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.actividadTerminada()).toBe(true);
    expect(comp.mostrarExito()).toBe(false);
    expect(comp.disponibles().length).toBe(0);
    expect(comp.casilleros().map(i => i?.id)).toEqual([1, 2, 3, 4]);
    expect(speakSpy).not.toHaveBeenCalled();

    expect(textoVisible(dom())).toContain('Actividad completada · Solo lectura');
    expect(textoVisible(dom())).toContain('23/10/2026 a las 14:30 hs');
    expect(textoVisible(dom())).toContain('Intentos realizados: 3');
    expect(existeBoton(dom(), 'TERMINAR')).toBe(false);

    // Cubre fallback de intentos cuando cantidadIntentos y totalIntentos son undefined e intentos está vacío
    comp.cargarEstadoResuelto(1);
    responder(
      http,
      'GET',
      '/tareas/1/resultado',
      crearHistorialTareaDto({ cantidadIntentos: undefined, totalIntentos: undefined, intentos: [] }),
    );
    await fixture.whenStable();
    expect(comp.totalIntentosRealizados()).toBe(1);
  });

  it('interacción por click en el DOM → selecciona, deselecciona, asigna a casillero, devuelve a disponibles y bloquea si terminó', async () => {
    await crear(1);
    const comp = fixture.componentInstance;

    // Click en casillero vacío sin imagen seleccionada → no modifica nada
    comp.asignarACasillero(0);
    expect(comp.casilleros()[0]).toBeNull();

    const imgEl = dom().querySelector('.grilla-imagenes .item-imagen') as HTMLElement;
    imgEl.click();
    await fixture.whenStable();
    expect(comp.imagenSeleccionada()).not.toBeNull();

    // Segundo click en la misma imagen → la deselecciona
    imgEl.click();
    await fixture.whenStable();
    expect(comp.imagenSeleccionada()).toBeNull();

    // Seleccionar de nuevo y hacer click en el casillero 0 del DOM
    imgEl.click();
    await fixture.whenStable();
    const casillero0 = dom().querySelector('.casillero') as HTMLElement;
    casillero0.click();
    await fixture.whenStable();
    expect(comp.casilleros()[0]).not.toBeNull();
    expect(comp.disponibles().length).toBe(3);

    // Click en el casillero 0 ocupado → devuelve la imagen a disponibles
    casillero0.click();
    await fixture.whenStable();
    expect(comp.casilleros()[0]).toBeNull();
    expect(comp.disponibles().length).toBe(4);

    // Si la actividad está terminada, solo lee el título en voz alta (si hay imagen) y no modifica estado
    comp.casilleros.set([comp.disponibles()[0], null, null, null]);
    comp.actividadTerminada.set(true);
    comp.seleccionarImagen(comp.disponibles()[0]);
    comp.asignarACasillero(0);
    comp.asignarACasillero(1); // casillero vacío en modo terminado
    expect(comp.imagenSeleccionada()).toBeNull();
  });

  it('eventos drag and drop en el DOM → arrastra desde disponibles al casillero, entre casilleros, de regreso a disponibles y respeta bloqueo', async () => {
    await crear(1);
    const comp = fixture.componentInstance;
    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() };

    const crearEventoDrag = (tipo: string) => {
      const ev = new Event(tipo, { bubbles: true, cancelable: true });
      Object.assign(ev, { dataTransfer });
      return ev;
    };

    const imgDisponible = dom().querySelector('.grilla-imagenes .item-imagen') as HTMLElement;
    const casilleros = dom().querySelectorAll('.casillero');
    const grillaImagenes = dom().querySelector('.grilla-imagenes') as HTMLElement;

    imgDisponible.dispatchEvent(crearEventoDrag('dragstart'));
    casilleros[0].dispatchEvent(crearEventoDrag('dragover'));
    expect(comp.casilleroHover()).toBe(0);

    casilleros[0].dispatchEvent(crearEventoDrag('dragleave'));
    expect(comp.casilleroHover()).toBeNull();

    casilleros[0].dispatchEvent(crearEventoDrag('drop'));
    imgDisponible.dispatchEvent(crearEventoDrag('dragend'));
    await fixture.whenStable();
    expect(comp.casilleros()[0]).not.toBeNull();

    // Arrastrar otra imagen disponible sobre el casillero 0 ocupado (reemplazo)
    const otraImgDisponible = dom().querySelector('.grilla-imagenes .item-imagen') as HTMLElement;
    otraImgDisponible.dispatchEvent(crearEventoDrag('dragstart'));
    casilleros[0].dispatchEvent(crearEventoDrag('drop'));
    await fixture.whenStable();

    // Arrastrar desde dentro del casillero 0 hacia el casillero 1
    const itemEnCasillero0 = casilleros[0].querySelector('.item-imagen') as HTMLElement;
    itemEnCasillero0.dispatchEvent(crearEventoDrag('dragstart'));
    itemEnCasillero0.dispatchEvent(crearEventoDrag('dragend'));
    itemEnCasillero0.dispatchEvent(crearEventoDrag('dragstart'));
    casilleros[1].dispatchEvent(crearEventoDrag('drop'));
    await fixture.whenStable();
    expect(comp.casilleros()[0]).toBeNull();
    expect(comp.casilleros()[1]).not.toBeNull();

    // Arrastrar desde casillero 1 de vuelta a la grilla de disponibles
    const itemEnCasillero1 = casilleros[1].querySelector('.item-imagen') as HTMLElement;
    itemEnCasillero1.dispatchEvent(crearEventoDrag('dragstart'));
    grillaImagenes.dispatchEvent(crearEventoDrag('dragover'));
    grillaImagenes.dispatchEvent(crearEventoDrag('drop'));
    await fixture.whenStable();
    expect(comp.casilleros()[1]).toBeNull();

    // Drop sin imagen arrastrada o con actividad terminada no hace cambios
    casilleros[0].dispatchEvent(crearEventoDrag('drop'));
    grillaImagenes.dispatchEvent(crearEventoDrag('drop'));
    comp.actividadTerminada.set(true);
    const dragEv = crearEventoDrag('dragstart') as unknown as DragEvent;
    comp.onDragStart(dragEv, comp.disponibles()[0]);
    comp.onDragOver(dragEv, 0);
    comp.onDropEnCasillero(dragEv, 0);
    comp.onDropEnDisponibles(dragEv);
    expect(comp.imagenArrastrada()).toBeNull();
  });

  it('eventos touch en el DOM → mueve una imagen al casillero, permite devolverla a disponibles y respeta bloqueo', async () => {
    await crear(1);
    const comp = fixture.componentInstance;
    const casilleros = dom().querySelectorAll('.casillero');
    const grillaImagenes = dom().querySelector('.grilla-imagenes') as HTMLElement;

    const crearEventoTouch = (tipo: string) => {
      const ev = new Event(tipo, { bubbles: true, cancelable: true });
      Object.assign(ev, {
        touches: [{ clientX: 100, clientY: 200 }],
        changedTouches: [{ clientX: 100, clientY: 200 }],
      });
      return ev;
    };

    const imgDisponible = dom().querySelector('.grilla-imagenes .item-imagen') as HTMLElement;
    imgDisponible.dispatchEvent(crearEventoTouch('touchmove'));

    // TouchStart en disponible → TouchMove sobre casillero 0 → TouchEnd
    document.elementFromPoint = vi.fn().mockReturnValue(casilleros[0]);
    imgDisponible.dispatchEvent(crearEventoTouch('touchstart'));
    imgDisponible.dispatchEvent(crearEventoTouch('touchmove'));
    expect(comp.casilleroHover()).toBe(0);
    imgDisponible.dispatchEvent(crearEventoTouch('touchend'));
    await fixture.whenStable();
    expect(comp.casilleros()[0]).not.toBeNull();

    // TouchStart desde el casillero 0 → TouchMove fuera → TouchEnd sobre grilla disponibles
    const itemEnCasillero0 = casilleros[0].querySelector('.item-imagen') as HTMLElement;
    document.elementFromPoint = vi.fn().mockReturnValue(grillaImagenes);
    itemEnCasillero0.dispatchEvent(crearEventoTouch('touchstart'));
    itemEnCasillero0.dispatchEvent(crearEventoTouch('touchmove'));
    expect(comp.casilleroHover()).toBeNull();
    itemEnCasillero0.dispatchEvent(crearEventoTouch('touchend'));
    await fixture.whenStable();
    expect(comp.casilleros()[0]).toBeNull();

    // Guard en onTouchStart cuando la actividad está terminada
    comp.actividadTerminada.set(true);
    comp.onTouchStart(crearEventoTouch('touchstart') as unknown as TouchEvent, comp.disponibles()[0]);
    expect(comp.imagenArrastrada()).toBeNull();
  });

  it('botón de audio, síntesis de voz y botón IR AL INICIO del modal → alterna voz y ejecuta volver sin historial', async () => {
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

    await crear(1);
    const comp = fixture.componentInstance;

    comp.leerTexto('Probando lectura');
    expect(speakSpy).toHaveBeenCalled();

    const btnAudio = dom().querySelector('button.btn-audio-toggle') as HTMLButtonElement;
    btnAudio.click();
    await fixture.whenStable();
    expect(comp.audioHabilitado()).toBe(false);
    expect(cancelSpy).toHaveBeenCalled();

    // Segundo click vuelve a activar el audio
    btnAudio.click();
    await fixture.whenStable();
    expect(comp.audioHabilitado()).toBe(true);

    await ubicarTodasLasImagenes();
    await clic(fixture, 'TERMINAR');
    responder(http, 'POST', '/tareas/1/entrega', crearResultadoTareaDto({ aciertos: 4, totalItems: 4 }));
    await fixture.whenStable();

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    await clic(fixture, 'IR AL INICIO');
    expect(navigate).toHaveBeenCalledWith(['/mi-carpeta']);
  });

  it('error al cargar detalle en ngOnInit o ruta sin tareaId → aplica fallback con imágenes base', async () => {
    TestBed.configureTestingModule({
      imports: [ActividadOrdenarComponent],
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
    fixture = TestBed.createComponent(ActividadOrdenarComponent);
    await fixture.whenStable();

    responderError(http, 'GET', '/tareas/99', 500);
    await fixture.whenStable();
    expect(fixture.componentInstance.disponibles().length).toBe(4);

    fixture.componentInstance['route'].snapshot.queryParamMap.get = () => null;
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.disponibles().length).toBe(4);
  });

  it('click en TERMINAR con casilleros incompletos → muestra mensaje de alerta y NO envía petición', async () => {
    await crear(1);

    await clic(fixture, 'TERMINAR');

    expect(textoVisible(dom())).toContain('Por favor, ubicá todas las imágenes antes de terminar.');
    sinPeticiones(http, '/entrega');
  });

  it('todos los casilleros completados (4/4) → envía POST /tareas/:id/entrega, guarda hora, muestra felicitaciones y oculta VOLVER A INTENTAR', async () => {
    await crear(1);
    await ubicarTodasLasImagenes();

    await clic(fixture, 'TERMINAR');
    const req = responder(
      http,
      'POST',
      '/tareas/1/entrega',
      crearResultadoTareaDto({ aciertos: 4, totalItems: 4 }),
    );
    await fixture.whenStable();

    expect(req.request.body).toEqual({
      items: [
        { itemId: 2, posicionElegida: 1, itemUnidoId: null },
        { itemId: 1, posicionElegida: 2, itemUnidoId: null },
        { itemId: 4, posicionElegida: 3, itemUnidoId: null },
        { itemId: 3, posicionElegida: 4, itemUnidoId: null },
      ],
    });
    expect(textoVisible(dom())).toContain('¡Felicitaciones!');
    expect(textoVisible(dom())).toContain('4 / 4');
    expect(existeBoton(dom(), 'VOLVER A INTENTAR')).toBe(false);
    expect(localStorage.getItem('chispas_hora_tarea_1')).toContain('hs');
  });

  it.each([
    { aciertos: 3, totalItems: 4, tituloEsperado: '¡Estuviste muy cerca!' },
    { aciertos: 1, totalItems: 4, tituloEsperado: '¡Buen intento!' },
  ])('resultado parcial ($aciertos/$totalItems) → modal muestra título "$tituloEsperado" y permite VOLVER A INTENTAR', async ({ aciertos, totalItems, tituloEsperado }) => {
    await crear(1);
    await ubicarTodasLasImagenes();

    await clic(fixture, 'TERMINAR');
    responder(http, 'POST', '/tareas/1/entrega', crearResultadoTareaDto({ aciertos, totalItems }));
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain(tituloEsperado);
    expect(textoVisible(dom())).toContain(`${aciertos} / ${totalItems}`);
    expect(existeBoton(dom(), 'VOLVER A INTENTAR')).toBe(true);
  });

  it.each([
    { status: 400, desc: 'solicitud inválida' },
    { status: 500, desc: 'error interno de servidor' },
  ])('backend responde error $status al entregar → muestra alerta y no navega', async ({ status }) => {
    await crear(1);
    await ubicarTodasLasImagenes();

    await clic(fixture, 'TERMINAR');
    responderError(http, 'POST', '/tareas/1/entrega', status);
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('Ocurrió un error al enviar las respuestas al servidor.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('backend sin conexión al entregar → muestra alerta de error', async () => {
    await crear(1);
    await ubicarTodasLasImagenes();

    await clic(fixture, 'TERMINAR');
    responderSinConexion(http, 'POST', '/tareas/1/entrega');
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('Ocurrió un error al enviar las respuestas al servidor.');
  });

  it('backend responde 409 (tarea ya finalizada) → activa vista resuelta de solo lectura y fallback de 1 intento si falla historial', async () => {
    await crear(1);
    await ubicarTodasLasImagenes();

    await clic(fixture, 'TERMINAR');
    responderError(http, 'POST', '/tareas/1/entrega', 409);
    await fixture.whenStable();

    responderError(http, 'GET', '/tareas/1/resultado', 500);
    await fixture.whenStable();

    expect(textoVisible(dom())).toContain('Actividad completada · Solo lectura');
    expect(textoVisible(dom())).toContain('Intentos realizados: 1');
    expect(existeBoton(dom(), 'TERMINAR')).toBe(false);
  });

  it('click en botón volver del encabezado → ejecuta location.back()', async () => {
    await crear(1);
    window.history.pushState({}, '', '/otra-ruta');

    const btnVolver = dom().querySelector('button.btn-volver') as HTMLButtonElement;
    btnVolver.click();
    await fixture.whenStable();

    expect(locationBack).toHaveBeenCalled();
  });

  it('click en VOLVER A INTENTAR en el modal → limpia casilleros y reubica las imágenes', async () => {
    await crear(1);
    await ubicarTodasLasImagenes();

    await clic(fixture, 'TERMINAR');
    responder(http, 'POST', '/tareas/1/entrega', crearResultadoTareaDto({ aciertos: 2, totalItems: 4 }));
    await fixture.whenStable();

    await clic(fixture, 'VOLVER A INTENTAR');

    expect(dom().querySelectorAll('.casillero.vacio').length).toBe(4);
  });
});