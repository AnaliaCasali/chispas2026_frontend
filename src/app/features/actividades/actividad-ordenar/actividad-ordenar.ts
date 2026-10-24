import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  ActividadService,
  ItemRespuestaDTO,
  ResultadoTareaDTO
} from '../../../core/services/actividad.service';
import { ActividadExitoComponent } from '../actividad-exito/actividad-exito';
import { environment } from '../../../../environments/environment.production';

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
  private location = inject(Location);

  audioHabilitado = signal<boolean>(true);
  tareaId = signal<number>(1);

  materiaNombre = signal<string>('LENGUA Y LITERATURA');
  temaContenido = signal<string>('Don Quijote de la Mancha');
  consignaTexto = signal<string>('Arrastrá o tocá las imágenes para colocarlas en el orden correcto');

  guardando = signal<boolean>(false);
  actividadTerminada = signal<boolean>(false);
  mostrarExito = signal<boolean>(false);
  guardadoExitoso = signal<boolean>(false);

  // Datos para vista de actividad ya realizada (solo lectura)
  horaCompletada = signal<string>('');
  totalIntentosRealizados = signal<number>(0);

  aciertosObtenidos = signal<number | null>(null);
  totalItems = signal<number>(4);
  tituloModal = signal<string>('¡Excelente trabajo!');
  mensajeModal = signal<string>('');
  puedeReintentar = signal<boolean>(true);

  mensaje = signal<{ texto: string; tipo: 'exito' | 'error' | 'info' | null }>({
    texto: '',
    tipo: null
  });

  private backendBase = environment.backendUrl;
  imagenesBase: ImagenActividad[] = [
    { id: 2, titulo: 'Sale de su casa', url: `${this.backendBase}/images/don-quijote-saliendo.webp` },
    { id: 1, titulo: 'Don Quijote lee', url: `${this.backendBase}/images/don-quijote-leyendo.webp` },
    { id: 4, titulo: 'Vuelve a casa', url: `${this.backendBase}/images/don-quijote-volviendo.webp` },
    { id: 3, titulo: 'Ve Molinos', url: `${this.backendBase}/images/don-quijote-molino.webp` }
  ];

  disponibles = signal<ImagenActividad[]>([]);
  casilleros = signal<(ImagenActividad | null)[]>([null, null, null, null]);

  imagenSeleccionada = signal<ImagenActividad | null>(null);
  imagenArrastrada = signal<{ img: ImagenActividad; origenCasilleroIndex?: number } | null>(null);
  casilleroHover = signal<number | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('tareaId') || this.route.snapshot.queryParamMap.get('tareaId');
    if (idParam) {
      this.tareaId.set(Number(idParam));
      this.cargarDatosBackend(Number(idParam));
    } else {
      this.reintentar();
      this.leerConsigna();
    }
  }

  cargarDatosBackend(tareaId: number): void {
    this.actividadService.obtenerDetalle(tareaId).subscribe({
      next: (detalle) => {
        if (detalle.materia?.nombre) this.materiaNombre.set(detalle.materia.nombre.toUpperCase());
        const subtitulo = detalle.contenido?.texto || detalle.contenido?.titulo || detalle.titulo;
        if (subtitulo) this.temaContenido.set(subtitulo);
        if (detalle.consigna) this.consignaTexto.set(detalle.consigna);

        this.imagenesBase = detalle.items.map(item => ({
          id: item.itemId,
          titulo: item.titulo || item.textoAlt,
          url: item.imagenUrl
        }));
        this.totalItems.set(detalle.items.length);
        this.casilleros.set(new Array(detalle.items.length).fill(null));

        if (detalle.realizada) {
          this.cargarEstadoResuelto(tareaId);
        } else {
          this.reintentar();
          this.leerConsigna();
        }
      },
      error: (err) => {
        console.error('Error al cargar detalle de la tarea:', err);
        this.reintentar();
        this.leerConsigna();
      }
    });
  }

  cargarEstadoResuelto(tareaId: number): void {
    this.actividadTerminada.set(true);
    this.mostrarExito.set(false);
    this.guardadoExitoso.set(true);
    this.imagenSeleccionada.set(null);
    this.imagenArrastrada.set(null);
    this.casilleroHover.set(null);

    // 1. Armamos la secuencia resuelta ordenando por itemId ascendente (orden real en BD)
    const ordenResuelto = [...this.imagenesBase].sort((a, b) => a.id - b.id);
    this.casilleros.set(ordenResuelto);
    this.disponibles.set([]);

    // 2. Recuperamos la hora guardada localmente (si existe)
    if (this.esBrowser) {
      const horaGuardada = localStorage.getItem(`chispas_hora_tarea_${tareaId}`);
      if (horaGuardada) this.horaCompletada.set(horaGuardada);
    }

    // 3. Consultamos al endpoint existente GET /tareas/:id/resultado para obtener el total de intentos
    this.actividadService.obtenerHistorial(tareaId).subscribe({
      next: (historial) => {
        const intentos = historial.cantidadIntentos ?? historial.totalIntentos ?? historial.intentos?.length ?? 1;
        this.totalIntentosRealizados.set(intentos > 0 ? intentos : 1);
      },
      error: () => {
        this.totalIntentosRealizados.set(1);
      }
    });
  }

  private ahoraFormateado(): string {
    const ahora = new Date();
    const dia = ahora.getDate().toString().padStart(2, '0');
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const anio = ahora.getFullYear();
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${anio} a las ${horas}:${minutos} hs`;
  }

  private guardarHoraCompletada(tareaId: number): void {
    const horaTexto = this.ahoraFormateado();
    this.horaCompletada.set(horaTexto);
    if (this.esBrowser) {
      localStorage.setItem(`chispas_hora_tarea_${tareaId}`, horaTexto);
    }
  }

  leerConsigna(): void {
    this.leerTexto(this.consignaTexto());
  }

  seleccionarImagen(img: ImagenActividad) {
    if (this.actividadTerminada()) {
      this.leerTexto(img.titulo);
      return;
    }
    this.leerTexto(img.titulo);
    if (this.imagenSeleccionada()?.id === img.id) {
      this.imagenSeleccionada.set(null);
    } else {
      this.imagenSeleccionada.set(img);
    }
    this.mensaje.set({ texto: '', tipo: null });
  }

  asignarACasillero(index: number) {
    if (this.actividadTerminada()) {
      const img = this.casilleros()[index];
      if (img) this.leerTexto(img.titulo);
      return;
    }
    const seleccionada = this.imagenSeleccionada();
    if (seleccionada) {
      this.colocarEnCasillero(seleccionada, index);
      this.imagenSeleccionada.set(null);
    } else if (this.casilleros()[index]) {
      this.devolverCasilleroADisponibles(index);
    }
  }

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
    if (this.actividadTerminada()) return;
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
    if (this.actividadTerminada()) return;
    event.preventDefault();
    this.casilleroHover.set(null);
    const dragData = this.imagenArrastrada();
    if (!dragData) return;

    this.colocarEnCasillero(dragData.img, destinoIndex, dragData.origenCasilleroIndex);
    this.imagenArrastrada.set(null);
  }

  onDropEnDisponibles(event: DragEvent) {
    if (this.actividadTerminada()) return;
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

  terminar() {
    const actuales = this.casilleros();
    if (actuales.includes(null)) {
      const aviso = 'Por favor, ubicá todas las imágenes antes de terminar.';
      this.mensaje.set({ texto: 'Por favor, ubicá todas las imágenes antes de terminar.', tipo: 'error' });
      this.leerTexto(aviso);
      return;
    }

    const items: ItemRespuestaDTO[] = actuales.map((img, index) => ({
      itemId: img!.id,
      posicionElegida: index + 1,
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
        this.totalIntentosRealizados.update(n => n + 1);

        if (resultado.aciertos === resultado.totalItems) {
          this.tituloModal.set('¡Felicitaciones!');
          this.actividadTerminada.set(true);
          this.puedeReintentar.set(false);
          this.guardarHoraCompletada(this.tareaId());
      } else if (resultado.aciertos >= Math.ceil(resultado.totalItems / 2)) {
          this.tituloModal.set('¡Estuviste muy cerca!');
          this.puedeReintentar.set(true);
      } else {
          this.tituloModal.set('¡Buen intento!');
          this.puedeReintentar.set(true);
      }

        this.mostrarExito.set(true);
        const palabraAcierto = resultado.aciertos === 1 ? 'acierto' : 'aciertos';
        const locucionCompleta = `${resultado.mensaje} Tuviste ${resultado.aciertos} ${palabraAcierto} de ${resultado.totalItems}.`;
        this.leerTexto(locucionCompleta);
      },
      error: (err) => {
        this.guardando.set(false);

        if (err.status === 409) {
          this.cargarEstadoResuelto(this.tareaId());
        } else {
          const msg = err.error?.message || 'Ocurrió un error al enviar las respuestas al servidor.';
          this.mensaje.set({ texto: msg, tipo: 'error' });
        }
      }
    });
  }

  reintentar() {
    this.disponibles.set([...this.imagenesBase]);
    this.casilleros.set(new Array(this.imagenesBase.length || 4).fill(null));
    this.imagenSeleccionada.set(null);
    this.imagenArrastrada.set(null);
    this.casilleroHover.set(null);
    this.actividadTerminada.set(false);
    this.mostrarExito.set(false);
    this.guardadoExitoso.set(false);
    this.mensaje.set({ texto: '', tipo: null });
  }

  volver(): void {
    if (this.esBrowser && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/mi-carpeta']);
    }
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
