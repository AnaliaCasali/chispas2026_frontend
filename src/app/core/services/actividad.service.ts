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

export interface IntentoResumenDTO {
  intento: number;
  aciertos: number;
  totalItems?: number;
  total?: number;
}

export interface HistorialTareaDTO {
  tareaId: number;
  estado: string;
  ultimoResultado: ResultadoTareaDTO | null;
  intentoActual?: number;
  cantidadIntentos?: number;
  ultimoIntento?: number | null;
  totalIntentos?: number;
  intentos: IntentoResumenDTO[];
}

export interface ItemActividadDTO {
  itemId: number;
  imagenUrl: string;
  textoAlt: string;
  titulo: string;
  lado?: 'IZQ' | 'DER';
  posicion?: number | null;
}

export interface TareaDetalleDTO {
  tareaId: number;
  estado: string;
  realizada: boolean;
  materia: {
    carpetaEspacioId: number;
    nombre: string;
    color?: string;
    icono?: string;
  };
  contenido: {
    contenidoId?: number; 
    titulo?: string; 
    tema?: string; 
    texto?: string;
    portadaUrl?: string;
  };
  actividadId: number;
  titulo: string;
  consigna: string;
  tipoActividad: {
    codigo: 'ORDENAR' | 'UNIR_FLECHAS' | string;
    nombre: string;
  };
  items: ItemActividadDTO[];
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
  obtenerDetalle(tareaId: number): Observable<TareaDetalleDTO> {
    return this.http.get<TareaDetalleDTO>(`${this.apiUrl}/${tareaId}`);
  }
  obtenerHistorial(tareaId: number): Observable<HistorialTareaDTO> {
    return this.http.get<HistorialTareaDTO>(`${this.apiUrl}/${tareaId}/resultado`);
  }
}