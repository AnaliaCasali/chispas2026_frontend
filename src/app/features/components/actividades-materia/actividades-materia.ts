import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CarpetaService } from '../../services/carpeta.service';
import { ActividadesMateriaDTO, ActividadCarpetaDTO } from '../../models/inicio.model';

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

  carpetaEspacioId = signal<number | null>(null);
  datosMateria = signal<ActividadesMateriaDTO | null>(null);
  cargando = signal<boolean>(true);
  errorCarga = signal<boolean>(false);

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

  abrirTarea(tarea: ActividadCarpetaDTO): void {
    this.router.navigate(['/actividades', tarea.actividadId], {
      state: { materiaNombre: this.datosMateria()?.materia }
    });
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  }
}