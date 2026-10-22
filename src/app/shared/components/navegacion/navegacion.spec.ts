import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { NavegacionComponent } from './navegacion';
import { AuthService } from '../../../core/services/auth.service';
import { providersDePrueba } from '../../../../testing/http-de-prueba.helper';
import {
  ESTUDIANTE_PRUEBA,
  DOCENTE_PRUEBA,
  UsuarioPrueba,
  crearTokenDePrueba,
  crearUsuarioDe,
  cerrarSesionDePrueba,
} from '../../../../testing/sesion-de-prueba.helper';
import { textoVisible } from '../../../../testing/dom.helper';

// Claves reales que utiliza AuthService
const AUTH_TOKEN_KEY = 'chispas_token';
const AUTH_USER_KEY = 'chispas_user';

function iniciarSesionChispas(usuario: UsuarioPrueba = ESTUDIANTE_PRUEBA): void {
  const token = crearTokenDePrueba(usuario);
  const user = crearUsuarioDe(usuario);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  // Compatibilidad con otros helpers
  localStorage.setItem('rcc_token', token);
  localStorage.setItem('rcc_user', JSON.stringify(user));
}

function cerrarSesionChispas(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  cerrarSesionDePrueba();
}

describe('NavegacionComponent', () => {
  let fixture: ComponentFixture<NavegacionComponent>;
  let http: HttpTestingController;
  let authService: AuthService;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;
  const dom = () => fixture.nativeElement as HTMLElement;

  async function crear(urlInicial = '/inicio'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [NavegacionComponent],
      providers: providersDePrueba([], [
        { path: '', children: [] },
        { path: 'inicio', children: [] },
        { path: 'mi-carpeta', children: [] },
        { path: 'horarios', children: [] },
        { path: 'estudiante', children: [] },
        { path: 'login', children: [] },
        { path: 'bienvenida', children: [] },
      ]),
    });

    http = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    await router.navigateByUrl(urlInicial);

    fixture = TestBed.createComponent(NavegacionComponent);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    cerrarSesionChispas();
    vi.restoreAllMocks();
  });

  describe('Visibilidad del menú según autenticación y ruta', () => {
    it('usuario autenticado en ruta privada muestra el menú y sus enlaces', async () => {
      // Arrange
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');

      // Assert
      expect(fixture.componentInstance.mostrarMenu()).toBe(true);
      expect(textoVisible(dom())).toContain('CHISPAS INCLUSIVAS');
      expect(textoVisible(dom())).toContain('Mariel');
      expect(textoVisible(dom())).toContain('Inicio');
      expect(textoVisible(dom())).toContain('Mis Materias');
      expect(textoVisible(dom())).toContain('Horarios');
      expect(textoVisible(dom())).toContain('Mi Perfil');
      expect(dom().querySelector('.btn-logout')).not.toBeNull();
    });

    it('usuario no autenticado en ruta privada oculta el menú', async () => {
      cerrarSesionChispas();
      await crear('/inicio');

      expect(fixture.componentInstance.mostrarMenu()).toBe(false);
      expect(dom().querySelector('nav.barra-navegacion')).toBeNull();
    });

    it.each([
      { ruta: '/' },
      { ruta: '/login' },
      { ruta: '/bienvenida' },
    ])('usuario autenticado en ruta pública "$ruta" oculta el menú', async ({ ruta }) => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear(ruta);

      expect(fixture.componentInstance.mostrarMenu()).toBe(false);
      expect(dom().querySelector('nav.barra-navegacion')).toBeNull();
    });

    it('navegar de una pantalla privada a /login oculta reactivamente el menú', async () => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');
      expect(fixture.componentInstance.mostrarMenu()).toBe(true);

      await router.navigateByUrl('/login');
      await fixture.whenStable();

      expect(fixture.componentInstance.mostrarMenu()).toBe(false);
      expect(dom().querySelector('nav.barra-navegacion')).toBeNull();
    });
  });

  describe('Información del usuario y avatar', () => {
    it('usuario con nombre asignado renderiza el nombre y la inicial en el avatar', async () => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');

      expect(textoVisible(dom())).toContain('Mariel');
      const avatarTexto = dom().querySelector('.inicial-avatar')?.textContent?.trim();
      expect(avatarTexto).toBe('M');
    });

    it('usuario docente renderiza su respectivo nombre e inicial', async () => {
      iniciarSesionChispas(DOCENTE_PRUEBA);
      await crear('/inicio');

      expect(textoVisible(dom())).toContain('Laura');
      const avatarTexto = dom().querySelector('.inicial-avatar')?.textContent?.trim();
      expect(avatarTexto).toBe('L');
    });

    it('usuario sin nombre cargado recurre al username', async () => {
      const usuarioSinNombre = { ...crearUsuarioDe(ESTUDIANTE_PRUEBA), name: '' };
      localStorage.setItem(AUTH_TOKEN_KEY, crearTokenDePrueba(ESTUDIANTE_PRUEBA));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(usuarioSinNombre));

      await crear('/inicio');

      expect(textoVisible(dom())).toContain(ESTUDIANTE_PRUEBA.username);
    });

    it('usuario con foto definida muestra la imagen y no la inicial', async () => {
      const usuarioConFoto = {
        ...crearUsuarioDe(ESTUDIANTE_PRUEBA),
        foto: 'https://ejemplo.com/avatar.jpg',
      };
      localStorage.setItem(AUTH_TOKEN_KEY, crearTokenDePrueba(ESTUDIANTE_PRUEBA));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(usuarioConFoto));

      await crear('/inicio');

      const img = dom().querySelector('.avatar-usuario img') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe('https://ejemplo.com/avatar.jpg');
      expect(dom().querySelector('.inicial-avatar')).toBeNull();
    });
  });

  describe('Flujo del modal de cierre de sesión', () => {
    it('clic en el botón de logout abre el modal de confirmación', async () => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');

      expect(dom().querySelector('.overlay-modal')).toBeNull();

      const btnLogout = dom().querySelector('.btn-logout') as HTMLButtonElement;
      btnLogout.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.mostrarModalConfirmacion()).toBe(true);
      expect(dom().querySelector('.overlay-modal')).not.toBeNull();
      expect(textoVisible(dom())).toContain('Cerrar');
    });

    it('clic en Seguir aquí cancela el cierre de sesión y oculta el modal', async () => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');

      const btnLogout = dom().querySelector('.btn-logout') as HTMLButtonElement;
      btnLogout.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.mostrarModalConfirmacion()).toBe(true);

      const btnCancelar = dom().querySelector('.btn-modal-cancelar') as HTMLButtonElement;
      btnCancelar.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.mostrarModalConfirmacion()).toBe(false);
      expect(dom().querySelector('.overlay-modal')).toBeNull();
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('clic en Sí, salir cierra la sesión en AuthService, limpia el storage y navega a /login', async () => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');

      const btnLogout = dom().querySelector('.btn-logout') as HTMLButtonElement;
      btnLogout.click();
      await fixture.whenStable();

      const btnSalir = dom().querySelector('.btn-modal-salir') as HTMLButtonElement;
      btnSalir.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.mostrarModalConfirmacion()).toBe(false);
      expect(authService.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('clic en el fondo oscuro (overlay) cancela el cierre y cierra el modal', async () => {
      iniciarSesionChispas(ESTUDIANTE_PRUEBA);
      await crear('/inicio');

      const btnLogout = dom().querySelector('.btn-logout') as HTMLButtonElement;
      btnLogout.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.mostrarModalConfirmacion()).toBe(true);

      const overlay = dom().querySelector('.overlay-modal') as HTMLElement;
      overlay.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.mostrarModalConfirmacion()).toBe(false);
      expect(dom().querySelector('.overlay-modal')).toBeNull();
    });
  });
});