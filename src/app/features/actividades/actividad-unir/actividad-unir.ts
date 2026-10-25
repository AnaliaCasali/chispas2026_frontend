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
import { environment } from '../../../../environments/environment';

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

  tareaId = signal<number>(2);

  materiaNombre = signal<string>('LENGUA Y LITERATURA');
  temaContenido = signal<string>('Don Quijote de la Mancha');
  consignaTexto = signal<string>('Uní cada imagen con la frase que corresponde');

  get esEstudiante(): boolean {
    return this.authService.isAuthenticated() && this.authService.getRol() === 'ESTUDIANTE';
  }

  audioHabilitado = signal<boolean>(true);

  guardando = signal<boolean>(false);
  actividadTerminada = signal<boolean>(false);
  mostrarExito = signal<boolean>(false);
  guardadoExitoso = signal<boolean>(false);
  puedeReintentar = signal<boolean>(true);

  // Datos para vista de actividad ya realizada (solo lectura)
  horaCompletada = signal<string>('');
  totalIntentosRealizados = signal<number>(0);

  aciertosObtenidos = signal<number | null>(null);
  totalItems = signal<number>(4);
  tituloModal = signal<string>('¡Excelente trabajo!');
  mensajeModal = signal<string>('');
  mensajeAlerta = signal<{ texto: string; tipo: 'info' | 'aviso' | 'error' | null }>({
    texto: '',
    tipo: null
  });

  imagenes: ImagenUnir[] = [
    { id: 10, texto: 'Don Quijote lee un libro',url: `${environment.backendUrl}/images/don-quijote-leyendo.webp` },
    { id: 11, texto: 'Don Quijote sale de casa', url: `${environment.backendUrl}/images/don-quijote-saliendo.webp` },
    { id: 12, texto: 'Don Quijote ve un molino', url: `${environment.backendUrl}/images/don-quijote-molino.webp` },
    { id: 13, texto: 'Don Quijote vuelve a casa', url: `${environment.backendUrl}/images/don-quijote-volviendo.webp` }
  ];

  acciones: AccionTextoUnir[] = [
    { id: 101, texto: 'Don Quijote sale de casa' },
    { id: 102, texto: 'Don Quijote ve un molino' },
    { id: 103, texto: 'Don Quijote lee un libro' },
    { id: 104, texto: 'Don Quijote vuelve a casa' }
  ];

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

        this.imagenes = detalle.items
          .filter(item => item.lado === 'IZQ')
          .map(item => ({
            id: item.itemId,
            texto: item.titulo || item.textoAlt,
            url: item.imagenUrl
          }));

        this.acciones = detalle.items
          .filter(item => item.lado === 'DER')
          .map(item => ({
            id: item.itemId,
            texto: item.titulo || item.textoAlt
          }));

        this.totalItems.set(this.imagenes.length);

        if (detalle.realizada) {
          this.cargarEstadoResuelto(tareaId);
        } else {
          this.reintentar();
          this.leerConsigna();
        }

        if (this.esBrowser) {
          setTimeout(() => this.recalcularFlechas(), 150);
        }
      },
      error: (err) => {
        console.error('Error al cargar detalle de la actividad unir:', err);
        this.reintentar();
        this.leerConsigna();
      }
    });
  }

  cargarEstadoResuelto(tareaId: number): void {
    this.actividadTerminada.set(true);
    this.mostrarExito.set(false);
    this.guardadoExitoso.set(true);
    this.limpiarSelecciones();

    // 1. Armamos las flechas resueltas (desde localStorage si se guardaron o emparejando por texto)
    const conexionesResueltas: ConexionUnir[] = [];
    if (this.esBrowser) {
      const horaGuardada = localStorage.getItem(`chispas_hora_tarea_${tareaId}`);
      if (horaGuardada) this.horaCompletada.set(horaGuardada);

      const paresGuardadosRaw = localStorage.getItem(`chispas_pares_tarea_${tareaId}`);
      if (paresGuardadosRaw) {
        try {
          const paresGuardados: ItemRespuestaDTO[] = JSON.parse(paresGuardadosRaw);
          paresGuardados.forEach((p, idx) => {
            if (p.itemId != null && p.itemUnidoId != null) {
              const colorInfo = this.PALETA[idx % this.PALETA.length];
              conexionesResueltas.push({
                id: `${p.itemId}-${p.itemUnidoId}`,
                origenId: p.itemId,
                destinoId: p.itemUnidoId,
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                color: colorInfo.hex,
                colorNombre: colorInfo.nombre,
                estado: 'correcta'
              });
            }
          });
        } catch {
          // Si falla el parseo, usa el emparejamiento por defecto abajo
        }
      }
    }

    if (!conexionesResueltas.length) {
      this.imagenes.forEach((img, idx) => {
        const par = this.acciones.find(a => a.texto === img.texto) ?? this.acciones[idx];
        if (par) {
          const colorInfo = this.PALETA[idx % this.PALETA.length];
          conexionesResueltas.push({
            id: `${img.id}-${par.id}`,
            origenId: img.id,
            destinoId: par.id,
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            color: colorInfo.hex,
            colorNombre: colorInfo.nombre,
            estado: 'correcta'
          });
        }
      });
    }

    this.conexiones.set(conexionesResueltas);
    if (this.esBrowser) {
      setTimeout(() => this.recalcularFlechas(), 150);
    }

    // 2. Consultamos el endpoint existente GET /tareas/:id/resultado para mostrar los intentos totales
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

  private guardarDatosCompletada(tareaId: number, items: ItemRespuestaDTO[]): void {
    const horaTexto = this.ahoraFormateado();
    this.horaCompletada.set(horaTexto);
    if (this.esBrowser) {
      localStorage.setItem(`chispas_hora_tarea_${tareaId}`, horaTexto);
      localStorage.setItem(`chispas_pares_tarea_${tareaId}`, JSON.stringify(items));
    }
  }

  leerConsigna(): void {
    this.leerTexto(this.consignaTexto());
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
    if (this.actividadTerminada()) {
      this.leerTexto(img.texto);
      return;
    }
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
    if (this.actividadTerminada()) {
      this.leerTexto(accion.texto);
      return;
    }
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

  terminar(): void {
    const conns = this.conexiones();

    if (conns.length < this.imagenes.length) {
      const aviso = '¡Casi listo! Une las 4 imágenes con sus frases para ver tu resultado.';
      this.mensajeAlerta.set({ texto: aviso, tipo: 'aviso' });
      this.leerTexto(aviso);
      return;
    }

    const items: ItemRespuestaDTO[] = conns.map(c => ({
      itemId: c.origenId,
      itemUnidoId: c.destinoId,
      posicionElegida: null
    }));

    this.guardando.set(true);
    this.mensajeAlerta.set({ texto: '', tipo: null });

    this.actividadService.entregarTarea(this.tareaId(), { items }).subscribe({
      next: (resultado: ResultadoTareaDTO) => {
        this.guardando.set(false);
        this.guardadoExitoso.set(true);

        this.aciertosObtenidos.set(resultado.aciertos);
        this.totalItems.set(resultado.totalItems);
        this.mensajeModal.set(resultado.mensaje);
        this.puedeReintentar.set(resultado.puedeIntentar);
        this.totalIntentosRealizados.update(n => n + 1);

        const acertoTodo = resultado.aciertos === resultado.totalItems;

        conns.forEach(c => {
          c.estado = acertoTodo ? 'correcta' : 'revisar';
        });
        this.conexiones.set([...conns]);

        if (acertoTodo) {
          this.tituloModal.set('¡Felicitaciones!');
          this.actividadTerminada.set(true);
          this.puedeReintentar.set(false);
          this.guardarDatosCompletada(this.tareaId(), items);
        } else if (resultado.aciertos >= 2) {
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
          const msg = err.error?.message || 'Ocurrió un error al enviar tu entrega.';
          this.mensajeAlerta.set({ texto: msg, tipo: 'error' });
        }
      }
    });
  }

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
