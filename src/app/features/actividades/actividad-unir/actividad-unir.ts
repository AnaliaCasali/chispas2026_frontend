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
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ActividadService, ResultadoActividad } from '../../../core/services/actividad.service';
import { ActividadExitoComponent } from '../actividad-exito/actividad-exito';

export interface ImagenUnir {
  id: number;
  texto: string;
  url: string;
  parejaCorrectaId: number;
}

export interface AccionTextoUnir {
  id: number;
  texto: string;
  parejaCorrectaId: number;
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
  estado?: 'normal' | 'correcta' | 'revisar'; // Cambiado 'incorrecta' por 'revisar'
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

  private authService = inject(AuthService);
  private actividadService = inject(ActividadService);
  private router = inject(Router);
  private esBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get esEstudiante(): boolean {
    return this.authService.isAuthenticated() && this.authService.getRol() === 'ESTUDIANTE';
  }

  // Control de voz / accesibilidad
  audioHabilitado = signal<boolean>(true);

  // Estados de la actividad
  guardando = signal<boolean>(false);
  actividadTerminada = signal<boolean>(false);
  mostrarExito = signal<boolean>(false);
  guardadoExitoso = signal<boolean>(false);
  
  // Datos del resultado para el Modal
  aciertosObtenidos = signal<number>(0);
  tituloModal = signal<string>('¡Excelente trabajo!');
  mensajeModal = signal<string>('');
  mensajeAlerta = signal<{ texto: string; tipo: 'info' | 'aviso' | null }>({ texto: '', tipo: null });

  // 1. Columna Izquierda: Imágenes
  imagenes: ImagenUnir[] = [
    { id: 1, texto: 'Don Quijote lee un libro', url: 'assets/img/don-quijote-leyendo.png', parejaCorrectaId: 101 },
    { id: 2, texto: 'Don Quijote sale de casa', url: 'assets/img/don-quijote-saliendo.png', parejaCorrectaId: 102 },
    { id: 3, texto: 'Don Quijote ve un molino', url: 'assets/img/don-quijote-molino.png', parejaCorrectaId: 103 },
    { id: 4, texto: 'Don Quijote vuelve a casa', url: 'assets/img/don-quijote-volviendo.png', parejaCorrectaId: 104 }
  ];

  // 2. Columna Derecha: Frases breves
  acciones: AccionTextoUnir[] = [
    { id: 102, texto: 'Don Quijote sale de casa', parejaCorrectaId: 2 },
    { id: 103, texto: 'Don Quijote ve un molino', parejaCorrectaId: 3 },
    { id: 101, texto: 'Don Quijote lee un libro', parejaCorrectaId: 1 },
    { id: 104, texto: 'Don Quijote vuelve a casa', parejaCorrectaId: 4 }
  ];

  // Paleta armónica
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
    this.reintentar();
  }

  ngAfterViewInit(): void {
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
    if (!this.tablero) return;
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
  // EVALUACIÓN SEGÚN LA HISTORIA DE USUARIO (3 ESCENARIOS)
  // ============================================================
  terminar(): void {
    // if (!this.esEstudiante) return;
    const conns = this.conexiones();

    // Criterio: Debe completar todas las relaciones antes de terminar
    if (conns.length < this.imagenes.length) {
      const aviso = '¡Casi listo! Une las 4 imágenes con sus frases para ver tu resultado.';
      this.mensajeAlerta.set({ texto: aviso, tipo: 'aviso' });
      this.leerTexto(aviso);
      return;
    }

    let correctas = 0;
    conns.forEach(c => {
      const img = this.imagenes.find(i => i.id === c.origenId);
      const esCorrecta = img?.parejaCorrectaId === c.destinoId;
      // Sin rojo: o es 'correcta' (verde) o es 'revisar' (ámbar suave)
      c.estado = esCorrecta ? 'correcta' : 'revisar';
      if (esCorrecta) correctas++;
    });

    this.conexiones.set([...conns]);
    this.aciertosObtenidos.set(correctas);
    this.actividadTerminada.set(true);

    // Selección de mensaje según el Escenario de la HU
    if (correctas === 4) {
      // ESCENARIO 1: 4/4
      this.tituloModal.set('¡Felicitaciones!');
      this.mensajeModal.set('¡Muy bien! ¡Respondiste todo correctamente!');
    } else if (correctas >= 2) {
      // ESCENARIO 2: 3/4 o 2/4
      this.tituloModal.set('¡Estuviste muy cerca!');
      this.mensajeModal.set('¡Estuviste muy cerca! ¡Inténtalo de nuevo!');
    } else {
      // ESCENARIO 3: 1/4 o 0/4
      this.tituloModal.set('¡Buen intento!');
      this.mensajeModal.set('¡Buen intento! Cada vez que practicás, aprendés algo nuevo. ¡Volvé a intentarlo!');
    }

    // Abre la pantalla de desempeño y reproduce el mensaje motivador
    this.mostrarExito.set(true);
    this.leerTexto(this.mensajeModal());

    // Se guarda automáticamente el resultado/intento como exige la HU
    this.autoGuardarResultado(correctas);
  }

  private autoGuardarResultado(aciertos: number): void {
    // Si no tiene sesión (modo test), no interrumpe la experiencia
    if (!this.authService.isAuthenticated()) return;

    this.guardando.set(true);
    const resultado: ResultadoActividad = {
      actividadId: 1, // ID de la actividad de relacionar con flechas
      respuestasCorrectas: aciertos,
      totalPreguntas: 4,
      completado: aciertos === 4
    };

    this.actividadService.guardarResultado(resultado).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardadoExitoso.set(true);
      },
      error: () => {
        this.guardando.set(false);
        // Fallo silencioso o advertencia suave para no alarmar al estudiante
      }
    });
  }

  guardarManualmente(): void {
    this.autoGuardarResultado(this.aciertosObtenidos());
  }

  reintentar(): void {
    this.conexiones.set([]);
    this.limpiarSelecciones();
    this.actividadTerminada.set(false);
    this.mostrarExito.set(false);
    this.guardadoExitoso.set(false);
    this.mensajeAlerta.set({ texto: '', tipo: null });
  }

  irAInicio(): void {
    this.router.navigate(['/inicio']);
  }
}