import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CarpetaService } from '../../services/carpeta.service';
import { ActividadesMateriaDTO, ActividadCarpetaDTO } from '../../models/inicio.model';
import { ActividadService, HistorialTareaDTO } from '../../../core/services/actividad.service';
export type FiltroActividad = 'todas' | 'pendientes' | 'realizadas';

@Component({
  selector: 'app-actividades-materia',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './actividades-materia.html',
  styleUrl: './actividades-materia.css'
})
export class ActividadesMateriaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carpetaService = inject(CarpetaService);
  private actividadService = inject(ActividadService);
  carpetaEspacioId = signal<number | null>(null);
  datosMateria = signal<ActividadesMateriaDTO | null>(null);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);
  // Filtro de listado
  filtroActual = signal<FiltroActividad>('todas');
  // Modal para ver resultados de una tarea realizada
  historialSeleccionado = signal<HistorialTareaDTO | null>(null);
  tareaSeleccionadaTitulo = signal<string>('');
  cargandoHistorial = signal<boolean>(false);
  // Actividades filtradas calculadas reactivamente
  actividadesFiltradas = computed(() => {
    const lista = this.datosMateria()?.actividades ?? [];
    const filtro = this.filtroActual();
    if (filtro === 'pendientes') return lista.filter(a => !a.realizada);
    if (filtro === 'realizadas') return lista.filter(a => a.realizada);
    return lista;
  });
  totalPendientes = computed(() => (this.datosMateria()?.actividades ?? []).filter(a => !a.realizada).length);
  totalRealizadas = computed(() => (this.datosMateria()?.actividades ?? []).filter(a => a.realizada).length);
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.carpetaEspacioId.set(Number(idParam));
      this.cargarActividades();
    }
  }
  cargarActividades(): void {
    const id = this.carpetaEspacioId();
    if (!id) return;
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.carpetaService.obtenerActividadesDeMateria(id).subscribe({
      next: (data) => {
        this.datosMateria.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar actividades:', err);
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }
  cambiarFiltro(nuevoFiltro: FiltroActividad): void {
    this.filtroActual.set(nuevoFiltro);
  }
  abrirTarea(tarea: ActividadCarpetaDTO): void {
    const codigo = tarea.tipoActividad?.codigo?.toUpperCase();
    if (codigo === 'ORDENAR') {
      this.router.navigate(['/actividad/ordenar', tarea.tareaId], {
        state: { materiaNombre: this.datosMateria()?.materia }
      });
    } else if (codigo === 'UNIR_FLECHAS') {
      this.router.navigate(['/actividad/unir-con-flechas', tarea.tareaId], {
        state: { materiaNombre: this.datosMateria()?.materia }
      });
    } else {
      console.warn(`Plantilla "${codigo}" no reconocida, navegando a ordenar por defecto.`);
      this.router.navigate(['/actividad/ordenar', tarea.tareaId]);
    }
  }
  
  verResultadoTarea(tarea: ActividadCarpetaDTO): void {
    this.tareaSeleccionadaTitulo.set(tarea.titulo);
    this.cargandoHistorial.set(true);
    this.actividadService.obtenerHistorial(tarea.tareaId).subscribe({
      next: (historial) => {
        this.historialSeleccionado.set(historial);
        this.cargandoHistorial.set(false);
      },
      error: (err) => {
        console.error('Error al obtener el historial de la tarea:', err);
        this.cargandoHistorial.set(false);
      }
    });
  }
  cerrarModalHistorial(): void {
    this.historialSeleccionado.set(null);
  }
  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  }
}