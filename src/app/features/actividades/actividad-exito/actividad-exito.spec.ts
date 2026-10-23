import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActividadExitoComponent } from './actividad-exito';
import { providersDePrueba } from '../../../../testing/http-de-prueba.helper';
import { cerrarSesionDePrueba } from '../../../../testing/sesion-de-prueba.helper';
import { clic, existeBoton, botonPorTexto, textoVisible } from '../../../../testing/dom.helper';

describe('ActividadExitoComponent', () => {
  let fixture: ComponentFixture<ActividadExitoComponent>;
  let navigate: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ActividadExitoComponent],
      providers: providersDePrueba(),
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ActividadExitoComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  it('visible en true con datos válidos → muestra título, mensaje, badge de aciertos y botones', async () => {
    // Arrange
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('titulo', '¡Felicitaciones!');
    fixture.componentRef.setInput('mensaje', 'Resolviste la actividad');
    fixture.componentRef.setInput('aciertos', 4);
    fixture.componentRef.setInput('total', 4);
    await fixture.whenStable();

    // Act (renderizado)
    const texto = textoVisible(dom());

    // Assert
    expect(texto).toContain('¡Felicitaciones!');
    expect(texto).toContain('Resolviste la actividad');
    expect(texto).toContain('🎯 Aciertos: 4 / 4');
    expect(existeBoton(dom(), 'GUARDAR RESULTADO')).toBe(true);
    expect(existeBoton(dom(), 'VOLVER A INTENTAR')).toBe(true);
  });

  it('visible en false → no renderiza el modal en el DOM', async () => {
    await crear();
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(textoVisible(dom())).toBe('');
  });

  it.each([
    { aciertos: null, total: null },
    { aciertos: null, total: 4 },
    { aciertos: 4, total: null },
  ])('aciertos $aciertos o total $total en null → no renderiza el badge de aciertos', async ({ aciertos, total }) => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('aciertos', aciertos);
    fixture.componentRef.setInput('total', total);
    await fixture.whenStable();

    expect(textoVisible(dom())).not.toContain('🎯 Aciertos:');
  });

  it('click en GUARDAR RESULTADO → emite el evento guardar', async () => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    let emitido = false;
    fixture.componentInstance.guardar.subscribe(() => (emitido = true));

    await clic(fixture, 'GUARDAR RESULTADO');

    expect(emitido).toBe(true);
  });

  it.each([
    { guardando: true, guardadoExitoso: false, textoBoton: 'GUARDANDO...' },
    { guardando: false, guardadoExitoso: true, textoBoton: '¡GUARDADO CON ÉXITO! ✓' },
  ])('estado de guardado ($textoBoton) → botón disabled con texto correspondiente', async ({ guardando, guardadoExitoso, textoBoton }) => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('guardando', guardando);
    fixture.componentRef.setInput('guardadoExitoso', guardadoExitoso);
    await fixture.whenStable();

    const boton = botonPorTexto(dom(), textoBoton);
    expect(boton.disabled).toBe(true);
  });

  it('click en VOLVER A INTENTAR con rutaActividad → emite reiniciar y navega a la ruta', async () => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('rutaActividad', '/actividad/ordenar');
    await fixture.whenStable();

    let emitido = false;
    fixture.componentInstance.reiniciar.subscribe(() => (emitido = true));

    await clic(fixture, 'VOLVER A INTENTAR');

    expect(emitido).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/actividad/ordenar']);
  });

  it('click en VOLVER A INTENTAR sin rutaActividad → emite reiniciar sin disparar navegación', async () => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('rutaActividad', '');
    await fixture.whenStable();

    let emitido = false;
    fixture.componentInstance.reiniciar.subscribe(() => (emitido = true));

    await clic(fixture, 'VOLVER A INTENTAR');

    expect(emitido).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('guardadoExitoso en true → muestra botón IR AL INICIO y emite continuar al cliquearlo', async () => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('guardadoExitoso', true);
    await fixture.whenStable();

    expect(existeBoton(dom(), 'IR AL INICIO')).toBe(true);

    let emitido = false;
    fixture.componentInstance.continuar.subscribe(() => (emitido = true));

    await clic(fixture, 'IR AL INICIO');

    expect(emitido).toBe(true);
  });

  it('guardadoExitoso en false → NO muestra el botón IR AL INICIO', async () => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('guardadoExitoso', false);
    await fixture.whenStable();

    expect(existeBoton(dom(), 'IR AL INICIO')).toBe(false);
  });

    it('puedeReintentar en false → oculta el botón VOLVER A INTENTAR', async () => {
    await crear();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('puedeReintentar', false);
    await fixture.whenStable();

    expect(existeBoton(dom(), 'VOLVER A INTENTAR')).toBe(false);
  });
});