import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navegacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navegacion.html',
  styleUrl: './navegacion.css'
})
export class NavegacionComponent {
  public authService = inject(AuthService);
  public router = inject(Router);

  mostrarMenu = signal<boolean>(false);
  mostrarModalConfirmacion = signal<boolean>(false);

  get usuario() {
    const user = this.authService.currentUser?.() as any;
    const nombreMostrar = user?.nombre || user?.username || user?.email || 'Estudiante';
    return {
      nombre: String(nombreMostrar),
      foto: user?.foto || null
    };
  }

  constructor() {
    this.actualizarVisibilidad(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.actualizarVisibilidad(event.urlAfterRedirects || event.url);
      });
  }

  private actualizarVisibilidad(url: string): void {
    const estaAutenticado = this.authService.isAuthenticated();
    const esRutaPublica = 
      url === '/' || 
      url.startsWith('/login') || 
      url.startsWith('/bienvenida');

    this.mostrarMenu.set(estaAutenticado && !esRutaPublica);
  }

  solicitarCerrarSesion(): void {
    this.mostrarModalConfirmacion.set(true);
  }

  cancelarCerrarSesion(): void {
    this.mostrarModalConfirmacion.set(false);
  }

  confirmarCerrarSesion(): void {
    this.mostrarModalConfirmacion.set(false);
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}