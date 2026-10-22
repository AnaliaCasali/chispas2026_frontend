import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemRespuestaDTO {
  itemId: number;
  posicionElegida?: number | null; 
  itemUnidoId?: number | null;     
}

export interface EntregaRequestDTO {
  items: ItemRespuestaDTO[];
}

export interface ResultadoTareaDTO {
  tareaId: number;
  aciertos: number;
  totalItems: number;
  mensaje: string;
  estado: 'Realizada' | 'Pendiente' | string;
  puedeIntentar: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tareas`;

  entregarTarea(tareaId: number, entrega: EntregaRequestDTO): Observable<ResultadoTareaDTO> {
    return this.http.post<ResultadoTareaDTO>(`${this.apiUrl}/${tareaId}/entrega`, entrega);
  }
}