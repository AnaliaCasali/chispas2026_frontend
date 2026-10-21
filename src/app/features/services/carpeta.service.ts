// src/app/services/carpeta.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActividadesMateriaDTO, MiCarpetaDTO } from '../models/inicio.model';

@Injectable({
  providedIn: 'root'
})
export class CarpetaService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/mi-carpeta';

  obtenerMiCarpeta(): Observable<MiCarpetaDTO> {
    return this.http.get<MiCarpetaDTO>(this.baseUrl);
  }

  obtenerActividadesDeMateria(carpetaEspacioId: number): Observable<ActividadesMateriaDTO> {
    return this.http.get<ActividadesMateriaDTO>(`${this.baseUrl}/materias/${carpetaEspacioId}/actividades`);
  }
}