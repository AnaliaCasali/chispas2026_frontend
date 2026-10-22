import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PerfilEstudiante } from '../models/perfil-estudiante.model';

@Injectable({ providedIn: 'root' })
export class EstudianteService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/estudiantes`;

  miPerfil() {
    return this.http.get<PerfilEstudiante>(`${this.API_URL}/mi-perfil`);
  }
}