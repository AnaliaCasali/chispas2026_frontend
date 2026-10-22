import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HorarioService } from '../../services/horario.service';
import { MiHorarioDTO, ClaseHorarioDTO } from '../../models/horario.model';

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './horarios.html',
  styleUrl: './horarios.css'
})
export class HorariosComponent implements OnInit {
  private horarioService = inject(HorarioService);
  private router = inject(Router);

  datosHorario = signal<MiHorarioDTO | null>(null);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarHorarios();
  }

  cargarHorarios(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.horarioService.obtenerMiHorario().subscribe({
      next: (data) => {
        this.datosHorario.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar horarios:', err);
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }

  abrirMateria(carpetaEspacioId: number): void {
    if (carpetaEspacioId) {
      this.router.navigate(['/mi-carpeta/materias', carpetaEspacioId]);
    }
  }

  formatearHora(horaStr: string): string {
    if (!horaStr) return '';
    const partes = horaStr.split(':');
    return `${partes[0]}:${partes[1]}`;
  }
}