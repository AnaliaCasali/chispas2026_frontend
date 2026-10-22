import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { BienvenidaComponent } from './bienvenida';
import { providersDePrueba } from '../../../../testing/http-de-prueba.helper';
import { cerrarSesionDePrueba } from '../../../../testing/sesion-de-prueba.helper';
import { clic, textoVisible, existeBoton } from '../../../../testing/dom.helper';

describe('BienvenidaComponent', () => {
  let fixture: ComponentFixture<BienvenidaComponent>;
  let http: HttpTestingController;
  let router: Router;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [BienvenidaComponent],
      providers: providersDePrueba([], [
        { path: 'login', children: [] },
      ]),
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(BienvenidaComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    cerrarSesionDePrueba();
    vi.restoreAllMocks();
  });

  describe('Renderizado inicial y contenido', () => {
    it('muestra la imagen del logo con su texto alternativo accesible', async () => {
      // Arrange & Act
      await crear();

      // Assert
      const imagen = dom().querySelector('img.imagen-logo') as HTMLImageElement;
      expect(imagen).not.toBeNull();
      expect(imagen.getAttribute('src')).toBe('img/logo-chispas.png');
      expect(imagen.getAttribute('alt')).toContain('Chispas Inclusivas');
    });

    it('muestra el texto de bienvenida amigable y el pie con el año actual', async () => {
      await crear();

      expect(textoVisible(dom())).toContain('Hola! Ingresa para acceder a tus actividades');
      expect(textoVisible(dom())).toContain('consultar tus materias y seguir aprendiendo');
      expect(textoVisible(dom())).toContain('2026 Chispas Inclusivas');
    });

    it('muestra el botón principal para ingresar a la cuenta', async () => {
      await crear();

      expect(existeBoton(dom(), 'Ingresar a mi cuenta')).toBe(true);
    });
  });

  describe('Navegación', () => {
    it('clic en "Ingresar a mi cuenta" tiene configurada la ruta hacia /login', async () => {
      await crear();

      const boton = dom().querySelector('button.btn-principal') as HTMLButtonElement;
      expect(boton.getAttribute('routerLink')).toBe('/login');

      await clic(fixture, 'Ingresar a mi cuenta');
      await fixture.whenStable();

      expect(router.url).toBe('/login');
    });
  });
});