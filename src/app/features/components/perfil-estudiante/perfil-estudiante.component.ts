import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user';
import { ApiError } from '../../../core/interceptors/error-interceptor';
import { EstudianteService } from '../../services/estudiante.service';
import { PerfilEstudiante } from '../../models/perfil-estudiante.model';

@Component({
  selector: 'app-perfil-estudiante',
  imports: [],
  templateUrl: './perfil-estudiante.component.html',
  styleUrl: './perfil-estudiante.component.css',
})
export class PerfilEstudianteComponent implements OnInit {
  private service = inject(EstudianteService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly id = input<string>();            // llega por la ruta (withComponentInputBinding)
  perfil = signal<PerfilEstudiante | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  esDocente = computed(() => this.auth.hasRole([Role.DOCENTE]));

  ngOnInit(): void {
    const id = this.id();
    const peticion = id ? this.service.perfilDe(+id) : this.service.miPerfil();
    peticion.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (p) => this.perfil.set(p),
      error: (err: ApiError) =>
        this.error.set(err.status === 403 || err.status === 404
          ? err.message
          : 'No se pudo cargar el perfil.'),
    });
  }

  volver(): void {
    this.router.navigate([this.esDocente() ? '/estudiantes' : '/inicio']);
  }
}