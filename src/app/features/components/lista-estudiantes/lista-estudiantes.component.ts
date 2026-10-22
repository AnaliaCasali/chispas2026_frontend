import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { EstudianteService } from '../../services/estudiante.service';
import { EstudianteResumen } from '../../models/perfil-estudiante.model';

@Component({
  selector: 'app-lista-estudiantes',
  imports: [],
  templateUrl: './lista-estudiantes.component.html',
  styleUrl: './lista-estudiantes.component.css',
})
export class ListaEstudiantesComponent implements OnInit {
  private service = inject(EstudianteService);
  private router = inject(Router);

  estudiantes = signal<EstudianteResumen[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.service.listar().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (lista) => this.estudiantes.set(lista),
      error: () => this.error.set('No se pudo cargar la lista de estudiantes.'),
    });
  }

  verPerfil(id: number): void {
    this.router.navigate(['/estudiantes', id, 'perfil']);
  }
}