import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ActividadService, ResultadoActividad } from '../../../core/services/actividad.service';
import { ActividadExitoComponent } from '../actividad-exito/actividad-exito';

interface ImagenActividad {
  id: number;
  titulo: string;
  url: string;
  ordenCorrecto: number;
}

@Component({
  selector: 'app-actividad-ordenar',
  standalone: true,
  imports: [CommonModule, ActividadExitoComponent],
  templateUrl: './actividad-ordenar.html',
  styleUrl: './actividad-ordenar.css'
})
export class ActividadOrdenarComponent {
  private authService = inject(AuthService);
  private actividadService = inject(ActividadService);
  private router = inject(Router);

  // Estados de control de actividad y guardado
  guardando = signal(false);
  actividadTerminada = signal(false);

  // Verificación de Rol (Criterio de aceptación: solo ESTUDIANTE)
  get esEstudiante(): boolean {
    return this.authService.isAuthenticated() && this.authService.getRol() === 'ESTUDIANTE';
  }

  // Datos mockeados
  imagenesDePrueba: ImagenActividad[] = [
    { id: 2, titulo: 'Sale de su casa', url: 'assets/img/don-quijote-saliendo.png', ordenCorrecto: 2 },
    { id: 1, titulo: 'Don Quijote lee', url: 'assets/img/don-quijote-leyendo.png', ordenCorrecto: 1 },
    { id: 4, titulo: 'Vuelve a casa', url: 'assets/img/don-quijote-volviendo.png', ordenCorrecto: 4 },
    { id: 3, titulo: 'Ve Molinos', url: 'assets/img/don-quijote-molino.png', ordenCorrecto: 3 }
  ];

  // Estado del tablero
  disponibles = signal<ImagenActividad[]>([...this.imagenesDePrueba]);
  casilleros = signal<(ImagenActividad | null)[]>([null, null, null, null]);
  
  // Estados de interacción
  imagenSeleccionada = signal<ImagenActividad | null>(null);
  imagenArrastrada = signal<{ img: ImagenActividad, origenCasilleroIndex?: number } | null>(null);
  casilleroHover = signal<number | null>(null);
  mensaje = signal<{ texto: string, tipo: 'exito' | 'error' | null }>({ texto: '', tipo: null });

  // Interacción por clic/tap
  seleccionarImagen(img: ImagenActividad) {
    if (this.imagenSeleccionada()?.id === img.id) {
      this.imagenSeleccionada.set(null);
    } else {
      this.imagenSeleccionada.set(img);
    }
    this.mensaje.set({ texto: '', tipo: null });
  }

  asignarACasillero(index: number) {
    const seleccionada = this.imagenSeleccionada();
    if (seleccionada) {
      this.colocarEnCasillero(seleccionada, index);
      this.imagenSeleccionada.set(null);
    } else if (this.casilleros()[index]) {
      // Si se toca un casillero ocupado sin nada seleccionado, regresa al banco
      this.devolverCasilleroADisponibles(index);
    }
  }

  // para drag-and-drop en movil
  onDragStart(event: DragEvent, img: ImagenActividad, origenCasilleroIndex?: number) {
    this.imagenArrastrada.set({ img, origenCasilleroIndex });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', img.id.toString());
    }
  }

  onDragOver(event: DragEvent, indexCasillero?: number) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (indexCasillero !== undefined) {
      this.casilleroHover.set(indexCasillero);
    }
  }

  onDragLeave() {
    this.casilleroHover.set(null);
  }

  onDropEnCasillero(event: DragEvent, destinoIndex: number) {
    event.preventDefault();
    this.casilleroHover.set(null);
    const dragData = this.imagenArrastrada();
    if (!dragData) return;

    this.colocarEnCasillero(dragData.img, destinoIndex, dragData.origenCasilleroIndex);
    this.imagenArrastrada.set(null);
  }

  onDropEnDisponibles(event: DragEvent) {
    event.preventDefault();
    const dragData = this.imagenArrastrada();
    if (dragData && dragData.origenCasilleroIndex !== undefined) {
      this.devolverCasilleroADisponibles(dragData.origenCasilleroIndex);
    }
    this.imagenArrastrada.set(null);
  }

  onDragEnd() {
    this.imagenArrastrada.set(null);
    this.casilleroHover.set(null);
  }

  // ----------------------------------------------------
  // ARRASTRE CON EL DEDO (TOUCH MOBILE / TABLET)
  // ----------------------------------------------------
  onTouchStart(event: TouchEvent, img: ImagenActividad, origenCasilleroIndex?: number) {
    this.imagenArrastrada.set({ img, origenCasilleroIndex });
  }

  onTouchMove(event: TouchEvent) {
    if (!this.imagenArrastrada()) return;

    // Evita el scroll de la página en móvil durante el arrastre
    if (event.cancelable) {
      event.preventDefault();
    }

    const touch = event.touches[0];
    const elementoDebajo = document.elementFromPoint(touch.clientX, touch.clientY);
    const casilleroEl = elementoDebajo?.closest('.casillero');

    if (casilleroEl) {
      const idxAttr = casilleroEl.getAttribute('data-index');
      this.casilleroHover.set(idxAttr !== null ? parseInt(idxAttr, 10) : null);
    } else {
      this.casilleroHover.set(null);
    }
  }

  onTouchEnd(event: TouchEvent) {
    const dragData = this.imagenArrastrada();
    const hoverIndex = this.casilleroHover();

    if (dragData && hoverIndex !== null) {
      this.colocarEnCasillero(dragData.img, hoverIndex, dragData.origenCasilleroIndex);
    } else if (dragData && dragData.origenCasilleroIndex !== undefined) {
      // Si se soltó sobre la zona de disponibles
      const touch = event.changedTouches[0];
      const elementoDebajo = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elementoDebajo?.closest('.grilla-imagenes')) {
        this.devolverCasilleroADisponibles(dragData.origenCasilleroIndex);
      }
    }

    this.imagenArrastrada.set(null);
    this.casilleroHover.set(null);
  }

  // Mutación de estado
  private colocarEnCasillero(img: ImagenActividad, destinoIndex: number, origenCasilleroIndex?: number) {
    const estadoActual = [...this.casilleros()];
    const disponiblesActuales = [...this.disponibles()];
    const ocupantePrevio = estadoActual[destinoIndex];

    if (origenCasilleroIndex !== undefined) {
      // Movimiento entre casilleros: se intercambian
      estadoActual[origenCasilleroIndex] = ocupantePrevio;
    } else {
      // Venía del banco de disponibles
      const idxDisp = disponiblesActuales.findIndex(i => i.id === img.id);
      if (idxDisp !== -1) disponiblesActuales.splice(idxDisp, 1);
      if (ocupantePrevio) disponiblesActuales.push(ocupantePrevio);
    }

    estadoActual[destinoIndex] = img;
    this.casilleros.set(estadoActual);
    this.disponibles.set(disponiblesActuales);
  }

  private devolverCasilleroADisponibles(casilleroIndex: number) {
    const estadoActual = [...this.casilleros()];
    const disponiblesActuales = [...this.disponibles()];
    const imagen = estadoActual[casilleroIndex];

    if (imagen) {
      disponiblesActuales.push(imagen);
      estadoActual[casilleroIndex] = null;
      this.casilleros.set(estadoActual);
      this.disponibles.set(disponiblesActuales);
    }
  }

mostrarExito = signal(false);
guardadoExitoso = signal(false);

// En terminar(): cuando correctas === 4
terminar() {
  if (!this.esEstudiante) return;
  const actuales = this.casilleros();
  
  if (actuales.includes(null)) {
    this.mensaje.set({ texto: 'Por favor, ubicá todas las imágenes antes de terminar.', tipo: 'error' });
    return;
  }
  let correctas = 0;
  actuales.forEach((img, i) => {
    if (img && img.ordenCorrecto === (i + 1)) correctas++;
  });
  if (correctas === 4) {
    this.actividadTerminada.set(true);
    this.mostrarExito.set(true); // <-- Abre la pantalla de éxito con los botones
  } else {
    this.mensaje.set({ texto: `Buen intento. Tuviste ${4 - correctas} errores. Tocá las imágenes para reubicarlas.`, tipo: 'error' });
  }
}

// En guardarResultado(): marcar guardadoExitoso
guardarResultado() {
  this.guardando.set(true);
  
  let correctas = 0;
  this.casilleros().forEach((img, i) => {
    if (img && img.ordenCorrecto === (i + 1)) correctas++;
  });
  const resultado: ResultadoActividad = {
    actividadId: 2,
    respuestasCorrectas: correctas,
    totalPreguntas: 4,
    completado: correctas === 4
  };
  this.actividadService.guardarResultado(resultado).subscribe({
    next: () => {
      this.guardando.set(false);
      this.guardadoExitoso.set(true);
    },
    error: () => {
      this.guardando.set(false);
      alert('Ocurrió un error al guardar los resultados.');
    }
  });
}

// En reintentar(): resetear señales y cerrar modal de éxito
reintentar() {
  this.disponibles.set([...this.imagenesDePrueba]);
  this.casilleros.set([null, null, null, null]);
  this.imagenSeleccionada.set(null);
  this.imagenArrastrada.set(null);
  this.casilleroHover.set(null);
  this.actividadTerminada.set(false);
  this.mostrarExito.set(false);
  this.guardadoExitoso.set(false);
  this.mensaje.set({ texto: '', tipo: null });
}
irAInicio() {
  this.router.navigate(['/inicio']);
}
}