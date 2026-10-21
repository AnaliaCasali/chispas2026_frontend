import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InicioService } from '../../services/inicio.service';
import { InicioDTO, MateriaInicioDTO } from '../../models/inicio.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioComponent implements OnInit {
  private servicioInicio = inject(InicioService);
  private router = inject(Router);

  datosInicio = signal<InicioDTO | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  // Fecha y hora formateada en tiempo real para la pastilla superior
  horaActualTexto = signal<string>(this.formatearFechaHora(new Date()));

  // Materia destacada (si hay clase ahora, viene primera en la lista)
  materiaActual = computed<MateriaInicioDTO | null>(() => {
    const datos = this.datosInicio();
    if (datos?.hayClaseAhora && datos.materias.length > 0) {
      return datos.materias[0];
    }
    return null;
  });

  ngOnInit(): void {
    this.cargarDatosInicio();
  }

  cargarDatosInicio(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicioInicio.obtenerInicio().subscribe({
      next: (datos) => {
        this.datosInicio.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar inicio:', err);
        this.error.set('No se pudo conectar con el servidor.');
        this.cargando.set(false);
      }
    });
  }

  abrirClaseActual(): void {
  const materia = this.materiaActual();
  if (!materia) return;

  // Si tiene actividad principal asignada, va directamente a realizarla
  if (materia.actividadPrincipal) {
    this.router.navigate(['/actividades', materia.actividadPrincipal.actividadId]);
  } else {
    // Si no tiene actividad principal, abre el listado de tareas de esa materia específica
    this.router.navigate(['/mi-carpeta/materias', materia.carpetaEspacioId, 'actividades']);
  }
  }

  private formatearFechaHora(fecha: Date): string {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const diaTexto = dias[fecha.getDay()];
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${diaTexto} ${horas}:${minutos}`;
  }

  irAMisMaterias(): void {
  const datos = this.datosInicio();
  if (datos && datos.materias && datos.materias.length > 0) {
    const primerId = datos.materias[0].carpetaEspacioId;
    this.router.navigate(['/mi-carpeta/materias', primerId, 'actividades']);
  } else {
    // Si el alumno no tiene ninguna materia asignada
    alert('No tienes materias asignadas actualmente.');
  }
  }
}