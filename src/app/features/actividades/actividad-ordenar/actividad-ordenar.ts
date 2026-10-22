import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  ActividadService,
  ItemRespuestaDTO,
  ResultadoTareaDTO
} from '../../../core/services/actividad.service';
import { ActividadExitoComponent } from '../actividad-exito/actividad-exito';

export interface ImagenActividad {
  id: number;
  titulo: string;
  url: string;
  ordenCorrecto?: number;
}

@Component({
  selector: 'app-actividad-ordenar',
  standalone: true,
  imports: [CommonModule, ActividadExitoComponent],
  templateUrl: './actividad-ordenar.html',
  styleUrl: './actividad-ordenar.css'
})
export class ActividadOrdenarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private actividadService = inject(ActividadService);
  private esBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  audioHabilitado = signal<boolean>(true);

  // ID de la tarea a resolver (por defecto 1, que es la tarea de Ordenar en chispas_bd.sql)
  tareaId = signal<number>(1);

  // Estados de control de actividad y guardado
  guardando = signal<boolean>(false);
  actividadTerminada = signal<boolean>(false);
  mostrarExito = signal<boolean>(false);
  guardadoExitoso = signal<boolean>(false);

  // Datos del resultado para el Modal
  aciertosObtenidos = signal<number | null>(null);
  totalItems = signal<number>(4);
  tituloModal = signal<string>('¡Excelente trabajo!');
  mensajeModal = signal<string>('');
  puedeReintentar = signal<boolean>(true);

  // Mensajes de alerta en pantalla
  mensaje = signal<{ texto: string; tipo: 'exito' | 'error' | 'info' | null }>({
    texto: '',
    tipo: null
  });

  // Imágenes que coinciden con los IDs de la base de datos (Actividad 1: Don Quijote)
  // Las imágenes se sirven desde resources/static/images/ del backend
  private backendBase = 'http://localhost:8080';
  imagenesBase: ImagenActividad[] = [
    { id: 2, titulo: 'Sale de su casa', url: `${this.backendBase}/images/don-quijote-saliendo.webp` },
    { id: 1, titulo: 'Don Quijote lee', url: `${this.backendBase}/images/don-quijote-leyendo.webp` },
    { id: 4, titulo: 'Vuelve a casa', url: `${this.backendBase}/images/don-quijote-volviendo.webp` },
    { id: 3, titulo: 'Ve Molinos', url: `${this.backendBase}/images/don-quijote-molino.webp` }
  ];

  // Estado del tablero
  disponibles = signal<ImagenActividad[]>([]);
  casilleros = signal<(ImagenActividad | null)[]>([null, null, null, null]);

  // Estados de interacción
  imagenSeleccionada = signal<ImagenActividad | null>(null);
  imagenArrastrada = signal<{ img: ImagenActividad; origenCasilleroIndex?: number } | null>(null);
  casilleroHover = signal<number | null>(null);

  ngOnInit(): void {
    // Tomar tareaId desde la ruta o query params si viene
    const idParam = this.route.snapshot.paramMap.get('tareaId') || this.route.snapshot.queryParamMap.get('tareaId');
    if (idParam) {
      this.tareaId.set(Number(idParam));
    }
    this.reintentar();
  }

  // Interacción por clic/tap
  seleccionarImagen(img: ImagenActividad) {
    if (this.actividadTerminada()) return;
    this.leerTexto(img.titulo);
    if (this.imagenSeleccionada()?.id === img.id) {
      this.imagenSeleccionada.set(null);
    } else {
      this.imagenSeleccionada.set(img);
    }
    this.mensaje.set({ texto: '', tipo: null });
  }

  asignarACasillero(index: number) {
    if (this.actividadTerminada()) return;
    const seleccionada = this.imagenSeleccionada();
    if (seleccionada) {
      this.colocarEnCasillero(seleccionada, index);
      this.imagenSeleccionada.set(null);
    } else if (this.casilleros()[index]) {
      this.devolverCasilleroADisponibles(index);
    }
  }

  // Drag and Drop Ratón
  onDragStart(event: DragEvent, img: ImagenActividad, origenCasilleroIndex?: number) {
    if (this.actividadTerminada()) return;
    this.leerTexto(img.titulo);
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

  // Touch Mobile / Tablet
  onTouchStart(event: TouchEvent, img: ImagenActividad, origenCasilleroIndex?: number) {
    if (this.actividadTerminada()) return;
    this.leerTexto(img.titulo);
    this.imagenArrastrada.set({ img, origenCasilleroIndex });
  }

  onTouchMove(event: TouchEvent) {
    if (!this.imagenArrastrada()) return;
    if (event.cancelable) event.preventDefault();

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
      const touch = event.changedTouches[0];
      const elementoDebajo = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elementoDebajo?.closest('.grilla-imagenes')) {
        this.devolverCasilleroADisponibles(dragData.origenCasilleroIndex);
      }
    }

    this.imagenArrastrada.set(null);
    this.casilleroHover.set(null);
  }

  private colocarEnCasillero(img: ImagenActividad, destinoIndex: number, origenCasilleroIndex?: number) {
    const estadoActual = [...this.casilleros()];
    const disponiblesActuales = [...this.disponibles()];
    const ocupantePrevio = estadoActual[destinoIndex];

    if (origenCasilleroIndex !== undefined) {
      estadoActual[origenCasilleroIndex] = ocupantePrevio;
    } else {
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

  // ============================================================
  // ENTREGA Y CORRECCIÓN REAL CON EL BACKEND (SIN MOCK)
  // ============================================================
  terminar() {
    const actuales = this.casilleros();
    if (actuales.includes(null)) {
      const aviso = 'Por favor, ubicá todas las imágenes antes de terminar.';
      this.mensaje.set({ texto: 'Por favor, ubicá todas las imágenes antes de terminar.', tipo: 'error' });
      this.leerTexto(aviso);
      return;
    }

    // Armar el payload ItemRespuestaDTO que espera el backend
    const items: ItemRespuestaDTO[] = actuales.map((img, index) => ({
      itemId: img!.id,
      posicionElegida: index + 1, // 1-based index (1, 2, 3, 4)
      itemUnidoId: null
    }));

    this.guardando.set(true);
    this.mensaje.set({ texto: '', tipo: null });

    this.actividadService.entregarTarea(this.tareaId(), { items }).subscribe({
      next: (resultado: ResultadoTareaDTO) => {
        this.guardando.set(false);
        this.guardadoExitoso.set(true);

        this.aciertosObtenidos.set(resultado.aciertos);
        this.totalItems.set(resultado.totalItems);
        this.mensajeModal.set(resultado.mensaje);
        this.puedeReintentar.set(resultado.puedeIntentar);

        if (resultado.aciertos === resultado.totalItems) {
          this.tituloModal.set('¡Felicitaciones!');
          this.actividadTerminada.set(true);
        } else if (resultado.aciertos >= Math.ceil(resultado.totalItems / 2)) {
          this.tituloModal.set('¡Estuviste muy cerca!');
        } else {
          this.tituloModal.set('¡Buen intento!');
        }

        // Abre el modal de desempeño y feedback
        this.mostrarExito.set(true);
        this.leerTexto(resultado.mensaje);
        const palabraAcierto = resultado.aciertos === 1 ? 'acierto' : 'aciertos';
        const locucionCompleta = `${resultado.mensaje} Tuviste ${resultado.aciertos} ${palabraAcierto} de ${resultado.totalItems}.`;
        this.leerTexto(locucionCompleta);
      },
        error: (err) => {
        this.guardando.set(false);

        if (err.status === 409) {
          this.actividadTerminada.set(true);
          this.aciertosObtenidos.set(null); 

          this.mensaje.set({ texto: '', tipo: null });

          this.tituloModal.set('¡Actividad ya completada!');
          this.mensajeModal.set('Ya respondiste correctamente esta actividad anteriormente.');
          this.puedeReintentar.set(false);
          this.guardadoExitoso.set(true);
          this.mostrarExito.set(true);
          this.leerTexto(this.mensajeModal());
        } else {
          const msg = err.error?.message || 'Ocurrió un error al enviar las respuestas al servidor.';
          this.mensaje.set({ texto: msg, tipo: 'error' });
        }
      }
    });
  }

  reintentar() {
    this.disponibles.set([...this.imagenesBase]);
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

    leerTexto(texto: string): void {
    if (!this.esBrowser || !this.audioHabilitado() || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const locucion = new SpeechSynthesisUtterance(texto);
    locucion.lang = 'es-AR';
    locucion.rate = 0.85;
    window.speechSynthesis.speak(locucion);
  }

  toggleAudio(): void {
    this.audioHabilitado.update(val => !val);
    if (!this.audioHabilitado() && this.esBrowser && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}