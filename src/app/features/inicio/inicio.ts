import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InicioService } from '../services/inicio.service';
import { ClaseActualResponse } from '../models/clase-actual.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioComponent implements OnInit {
  private servicioInicio = inject(InicioService);
  private enrutador = inject(Router);

  claseActual = signal<ClaseActualResponse | null>(null);
  cargando = signal<boolean>(true);
  mensajeError = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarClaseActual();
  }

  cargarClaseActual(): void {
    this.cargando.set(true);
    this.servicioInicio.obtenerClaseActual().subscribe({
      next: (datos: ClaseActualResponse) => {
        this.claseActual.set(datos);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        console.error('Error al traer la clase:', error);
        this.mensajeError.set('No se pudo cargar la clase actual');
        this.cargando.set(false);
      }
    });
  }

  irAClase(): void {
    const clase = this.claseActual();
    if (clase?.materiaId) {
      this.enrutador.navigate(['/materias', clase.materiaId]);
    }
  }
}