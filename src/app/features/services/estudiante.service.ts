import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MANTENER_SESION_EN_403 } from '../../core/interceptors/error-interceptor';
import { EstudianteResumen, PerfilEstudiante } from '../models/perfil-estudiante.model';

@Injectable({ providedIn: 'root' })
export class EstudianteService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/estudiantes`;

  miPerfil() {
    return this.http.get<PerfilEstudiante>(`${this.API_URL}/mi-perfil`);
  }

  // Un 403 acá es regla de negocio ("no es tu alumno"), no sesión vencida.
  perfilDe(id: number) {
    return this.http.get<PerfilEstudiante>(`${this.API_URL}/${id}/perfil`, {
      context: new HttpContext().set(MANTENER_SESION_EN_403, true),
    });
  }

  listar() {
    return this.http.get<EstudianteResumen[]>(this.API_URL);
  }
}