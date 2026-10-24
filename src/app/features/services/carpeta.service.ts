// src/app/services/carpeta.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActividadesMateriaDTO, MiCarpetaDTO } from '../models/inicio.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CarpetaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mi-carpeta`;

  obtenerMiCarpeta(): Observable<MiCarpetaDTO> {
    return this.http.get<MiCarpetaDTO>(this.apiUrl);
  }

  obtenerActividadesDeMateria(carpetaEspacioId: number): Observable<ActividadesMateriaDTO> {
    return this.http.get<ActividadesMateriaDTO>(`${this.apiUrl}/materias/${carpetaEspacioId}/actividades`);
  }
}
