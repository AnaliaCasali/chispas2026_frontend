import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../../core/interceptors/error-interceptor';
import { EstudianteService } from '../../services/estudiante.service';
import { CapacidadEstudiante, PerfilEstudiante } from '../../models/perfil-estudiante.model';

@Component({
  selector: 'app-perfil-estudiante',
  imports: [],
  templateUrl: './perfil-estudiante.component.html',
  styleUrl: './perfil-estudiante.component.css',
})
export class PerfilEstudianteComponent implements OnInit {
  private service = inject(EstudianteService);
  private router = inject(Router);

  perfil = signal<PerfilEstudiante | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Iniciales para el avatar cuando no hay foto
  iniciales = computed(() => {
    const p = this.perfil();
    return p ? `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase() : '';
  });

  // Agrupa la lista plana de capacidades por área
  capacidadesPorArea = computed(() => {
    const grupos = new Map<string, CapacidadEstudiante[]>();
    for (const c of this.perfil()?.capacidades ?? []) {
      grupos.set(c.area, [...(grupos.get(c.area) ?? []), c]);
    }
    return [...grupos].map(([area, items]) => ({ area, items }));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service.miPerfil().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (p) => this.perfil.set(p),
      error: (err: ApiError) =>
        this.error.set(err.status === 403 || err.status === 404
          ? err.message
          : 'No se pudo cargar tu perfil.'),
    });
  }

  volver(): void {
    this.router.navigate(['/inicio']);
  }
}