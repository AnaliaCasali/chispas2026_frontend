import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CarpetaService } from '../../services/carpeta.service';
import { MiCarpetaDTO, MateriaCarpetaDTO } from '../../models/inicio.model';

@Component({
  selector: 'app-mi-carpeta',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mi-carpeta.html',
  styleUrl: './mi-carpeta.css'
})
export class MiCarpetaComponent implements OnInit {
  private carpetaService = inject(CarpetaService);
  private router = inject(Router);

  datosCarpeta = signal<MiCarpetaDTO | null>(null);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarMaterias();
  }

  cargarMaterias(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.carpetaService.obtenerMiCarpeta().subscribe({
      next: (data) => {
        this.datosCarpeta.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar la carpeta del alumno:', err);
        this.errorCarga.set(true);
        this.cargando.set(false);
      }
    });
  }

  abrirMateria(materia: MateriaCarpetaDTO): void {
    this.router.navigate(['/mi-carpeta/materias', materia.carpetaEspacioId, 'actividades']);
  }
}