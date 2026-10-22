import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
  signal,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  ActividadService,
  ItemRespuestaDTO,
  ResultadoTareaDTO
} from '../../../core/services/actividad.service';
import { ActividadExitoComponent } from '../actividad-exito/actividad-exito';

export interface ImagenUnir {
  id: number;
  texto: string;
  url: string;
}

export interface AccionTextoUnir {
  id: number;
  texto: string;
}

export interface ConexionUnir {
  id: string;
  origenId: number;
  destinoId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  colorNombre: string;
  estado?: 'normal' | 'correcta' | 'revisar';
}

@Component({
  selector: 'app-actividad-unir',
  standalone: true,
  imports: [CommonModule, ActividadExitoComponent],
  templateUrl: './actividad-unir.html',
  styleUrl: './actividad-unir.css'
})
export class ActividadUnirComponent implements OnInit, AfterViewInit {
  @ViewChild('tablero', { static: false }) tablero!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private actividadService = inject(ActividadService);
  private esBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private location = inject(Location);

  // Tarea 2 en la base de datos es la actividad de Unir con Flechas de Don Quijote
  tareaId = signal<number>(2);

  materiaNombre = signal<string>('LENGUA Y LITERATURA');
  temaContenido = signal<string>('Don Quijote de la Mancha');
  consignaTexto = signal<string>('Uní cada imagen con la frase que corresponde');

  get esEstudiante(): boolean {
    return this.authService.isAuthenticated() && this.authService.getRol() === 'ESTUDIANTE';
  }

  // Control de voz / accesibilidad (Lectura por síntesis de voz)
  audioHabilitado = signal<boolean>(true);

  // Estados de control de la actividad
  guardando = signal<boolean>(false);
  actividadTerminada = signal<boolean>(false);
  mostrarExito = signal<boolean>(false);
  guardadoExitoso = signal<boolean>(false);
  puedeReintentar = signal<boolean>(true);

  // Datos para el Modal de Desempeño
  aciertosObtenidos = signal<number | null>(null);
  totalItems = signal<number>(4);
  tituloModal = signal<string>('¡Excelente trabajo!');
  mensajeModal = signal<string>('');
  mensajeAlerta = signal<{ texto: string; tipo: 'info' | 'aviso' | 'error' | null }>({
    texto: '',
    tipo: null
  });

  // 1. Columna Izquierda: 4 Imágenes de Don Quijote (IDs 10, 11, 12, 13 en la BD)
  imagenes: ImagenUnir[] = [
    { id: 10, texto: 'Don Quijote lee un libro', url: 'http://localhost:8080/images/don-quijote-leyendo.webp' },
    { id: 11, texto: 'Don Quijote sale de casa', url: 'http://localhost:8080/images/don-quijote-saliendo.webp' },
    { id: 12, texto: 'Don Quijote ve un molino', url: 'http://localhost:8080/images/don-quijote-molino.webp' },
    { id: 13, texto: 'Don Quijote vuelve a casa', url: 'http://localhost:8080/images/don-quijote-volviendo.webp' }
  ];

  // 2. Columna Derecha: 4 Frases de Don Quijote (IDs 101, 102, 103, 104 en la BD)
  acciones: AccionTextoUnir[] = [
    { id: 101, texto: 'Don Quijote sale de casa' },
    { id: 102, texto: 'Don Quijote ve un molino' },
    { id: 103, texto: 'Don Quijote lee un libro' },
    { id: 104, texto: 'Don Quijote vuelve a casa' }
  ];

  // Paleta de colores para las flechas
  readonly PALETA = [
    { nombre: 'azul', hex: '#2563eb' },
    { nombre: 'naranja', hex: '#f59e0b' },
    { nombre: 'verde', hex: '#10b981' },
    { nombre: 'rosa', hex: '#ec4899' }
  ];

  imagenSeleccionada = signal<ImagenUnir | null>(null);
  accionSeleccionada = signal<AccionTextoUnir | null>(null);
  conexiones = signal<ConexionUnir[]>([]);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('tareaId') || this.route.snapshot.queryParamMap.get('tareaId');
    if (idParam) {
      this.tareaId.set(Number(idParam));
      this.cargarDatosBackend(Number(idParam));
    } else {
      this.reintentar();
    }
  }

  cargarDatosBackend(tareaId: number): void {
    this.actividadService.obtenerDetalle(tareaId).subscribe({
      next: (detalle) => {
        if (detalle.materia?.nombre) this.materiaNombre.set(detalle.materia.nombre.toUpperCase());
        if (detalle.titulo) this.temaContenido.set(detalle.titulo);
        if (detalle.consigna) this.consignaTexto.set(detalle.consigna);
        // 1. Separamos los ítems de la columna izquierda (Imágenes)
        this.imagenes = detalle.items
          .filter(item => item.lado === 'IZQ')
          .map(item => ({
            id: item.itemId,
            texto: item.titulo || item.textoAlt,
            url: item.imagenUrl
          }));

        // 2. Separamos los ítems de la columna derecha (Frases / Textos)
        this.acciones = detalle.items
          .filter(item => item.lado === 'DER')
          .map(item => ({
            id: item.itemId,
            texto: item.titulo || item.textoAlt
          }));

        // 3. Cantidad de parejas que el alumno debe unir
        this.totalItems.set(this.imagenes.length);

        // 4. Si la tarea ya estaba finalizada en el backend, bloqueamos la edición
        if (detalle.realizada) {
          this.actividadTerminada.set(true);
          this.tituloModal.set('¡Actividad ya completada!');
          this.mensajeModal.set('Ya respondiste correctamente esta actividad anteriormente.');
          this.guardadoExitoso.set(true);
          this.mostrarExito.set(true);
        } else {
          // Preparamos el tablero limpio para resolver
          this.reintentar();
        }

        // 5. Esperamos un ciclo de renderizado para recalcular los puntos de conexión
        if (this.esBrowser) {
          setTimeout(() => this.recalcularFlechas(), 150);
        }
      },
      error: (err) => {
        console.error('Error al cargar detalle de la actividad unir:', err);
        this.reintentar(); // Si falla, queda con el estado inicial de respaldo
      }
    });
  }

    ngAfterViewInit(): void {
    if (!this.esBrowser) return;

    setTimeout(() => this.recalcularFlechas(), 150);
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onResizeOrScroll(): void {
    this.recalcularFlechas();
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

  seleccionarImagen(img: ImagenUnir): void {
    if (this.actividadTerminada()) return;
    this.leerTexto(img.texto);

    if (this.imagenSeleccionada()?.id === img.id) {
      this.imagenSeleccionada.set(null);
      return;
    }

    this.imagenSeleccionada.set(img);
    this.mensajeAlerta.set({ texto: '', tipo: null });

    const accion = this.accionSeleccionada();
    if (accion) {
      this.vincular(img.id, accion.id);
      this.limpiarSelecciones();
    }
  }

  seleccionarAccion(accion: AccionTextoUnir): void {
    if (this.actividadTerminada()) return;
    this.leerTexto(accion.texto);

    if (this.accionSeleccionada()?.id === accion.id) {
      this.accionSeleccionada.set(null);
      return;
    }

    this.accionSeleccionada.set(accion);
    this.mensajeAlerta.set({ texto: '', tipo: null });

    const img = this.imagenSeleccionada();
    if (img) {
      this.vincular(img.id, accion.id);
      this.limpiarSelecciones();
    }
  }

  vincular(origenId: number, destinoId: number): void {
    const actuales = this.conexiones().filter(
      c => c.origenId !== origenId && c.destinoId !== destinoId
    );

    const indexColor = actuales.length % this.PALETA.length;
    const colorInfo = this.PALETA[indexColor];

    const nuevaConexion: ConexionUnir = {
      id: `${origenId}-${destinoId}`,
      origenId,
      destinoId,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      color: colorInfo.hex,
      colorNombre: colorInfo.nombre,
      estado: 'normal'
    };

    this.conexiones.set([...actuales, nuevaConexion]);
    setTimeout(() => this.recalcularFlechas(), 20);
  }

  eliminarConexion(conexion: ConexionUnir): void {
    if (this.actividadTerminada()) return;
    this.conexiones.set(this.conexiones().filter(c => c.id !== conexion.id));
    this.mensajeAlerta.set({ texto: '', tipo: null });
  }

  limpiarSelecciones(): void {
    this.imagenSeleccionada.set(null);
    this.accionSeleccionada.set(null);
  }

  getConexionDeImagen(id: number): ConexionUnir | undefined {
    return this.conexiones().find(c => c.origenId === id);
  }

  getConexionDeAccion(id: number): ConexionUnir | undefined {
    return this.conexiones().find(c => c.destinoId === id);
  }

  recalcularFlechas(): void {
    if (!this.esBrowser || !this.tablero?.nativeElement?.getBoundingClientRect) return;
    const rectTablero = this.tablero.nativeElement.getBoundingClientRect();
    const lista = [...this.conexiones()];

    let huboCambios = false;
    lista.forEach(c => {
      const elOrigen = document.getElementById(`dot-izq-${c.origenId}`);
      const elDestino = document.getElementById(`dot-der-${c.destinoId}`);

      if (elOrigen && elDestino) {
        const r1 = elOrigen.getBoundingClientRect();
        const r2 = elDestino.getBoundingClientRect();

        c.x1 = r1.left + r1.width / 2 - rectTablero.left;
        c.y1 = r1.top + r1.height / 2 - rectTablero.top;
        c.x2 = r2.left + r2.width / 2 - rectTablero.left;
        c.y2 = r2.top + r2.height / 2 - rectTablero.top;
        huboCambios = true;
      }
    });

    if (huboCambios) {
      this.conexiones.set(lista);
    }
  }

  calcularPathCurva(c: ConexionUnir): string {
    const distancia = Math.abs(c.x2 - c.x1) * 0.45;
    return `M ${c.x1} ${c.y1} C ${c.x1 + distancia} ${c.y1}, ${c.x2 - distancia} ${c.y2}, ${c.x2} ${c.y2}`;
  }

  // ============================================================
  // EVALUACIÓN Y PERSISTENCIA AUTOMÁTICA SEGÚN LA HISTORIA DE USUARIO
  // ============================================================
  terminar(): void {
    const conns = this.conexiones();

    // Criterio: Debe completar las 4 relaciones antes de terminar
    if (conns.length < this.imagenes.length) {
      const aviso = '¡Casi listo! Une las 4 imágenes con sus frases para ver tu resultado.';
      this.mensajeAlerta.set({ texto: aviso, tipo: 'aviso' });
      this.leerTexto(aviso);
      return;
    }

    // Armar el payload ItemRespuestaDTO para TareaServiceImpl
    const items: ItemRespuestaDTO[] = conns.map(c => ({
      itemId: c.origenId,         // Ítem izquierda
      itemUnidoId: c.destinoId,   // Ítem derecha
      posicionElegida: null
    }));

    this.guardando.set(true);
    this.mensajeAlerta.set({ texto: '', tipo: null });

    this.actividadService.entregarTarea(this.tareaId(), { items }).subscribe({
      next: (resultado: ResultadoTareaDTO) => {
        this.guardando.set(false);
        this.guardadoExitoso.set(true); // Persistido en el backend automáticamente

        this.aciertosObtenidos.set(resultado.aciertos);
        this.totalItems.set(resultado.totalItems);
        this.mensajeModal.set(resultado.mensaje);
        this.puedeReintentar.set(resultado.puedeIntentar);

        const acertoTodo = resultado.aciertos === resultado.totalItems;

        // Feedback en las flechas
        conns.forEach(c => {
          c.estado = acertoTodo ? 'correcta' : 'revisar';
        });
        this.conexiones.set([...conns]);

        // Títulos de feedback acordes a los Escenarios 1, 2 y 3
        if (acertoTodo) {
          // ESCENARIO 1: 4/4 ("¡Felicitaciones respondiste todo correctamente!")
          this.tituloModal.set('¡Felicitaciones!');
          this.actividadTerminada.set(true);
        } else if (resultado.aciertos >= 2) {
          // ESCENARIO 2: 3/4 o 2/4 ("¡Estuviste muy cerca! ¡Inténtalo de nuevo!")
          this.tituloModal.set('¡Estuviste muy cerca!');
        } else {
          // ESCENARIO 3: 1/4 o 0/4 ("¡Buen intento! Cada vez que practicás...")
          this.tituloModal.set('¡Buen intento!');
        }

        // Abre el modal y reproduce por voz el mensaje devuelto por el servidor
        this.mostrarExito.set(true);
        this.leerTexto(resultado.mensaje);
        const palabraAcierto = resultado.aciertos === 1 ? 'acierto' : 'aciertos';
        const locucionCompleta = `${resultado.mensaje} Tuviste ${resultado.aciertos} ${palabraAcierto} de ${resultado.totalItems}.`;
        this.leerTexto(locucionCompleta);
      },
        error: (err) => {
        this.guardando.set(false);

        if (err.status === 409) {
          // Ocultar botón TERMINAR
          this.actividadTerminada.set(true);
          this.aciertosObtenidos.set(null); 

          // Limpiar alertas del tablero
          this.mensajeAlerta.set({ texto: '', tipo: null });

          // Abrir modal con mensaje cordial
          const msg = '¡Ya respondiste correctamente esta actividad anteriormente!';
          this.tituloModal.set('¡Actividad ya completada!');
          this.mensajeModal.set(msg);
          this.guardadoExitoso.set(true);
          this.mostrarExito.set(true);
          this.leerTexto(msg);
        } else {
          const msg = err.error?.message || 'Ocurrió un error al enviar tu entrega.';
          this.mensajeAlerta.set({ texto: msg, tipo: 'error' });
        }
      }
    });
  }

  // Prepara el tablero para el siguiente intento (intento 2, 3...)
  reintentar(): void {
    this.conexiones.set([]);
    this.limpiarSelecciones();
    this.actividadTerminada.set(false);
    this.mostrarExito.set(false);
    this.guardadoExitoso.set(false);
    this.mensajeAlerta.set({ texto: '', tipo: null });
  }

  volver(): void {
    if (this.esBrowser && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/mi-carpeta']);
    }
  }
}