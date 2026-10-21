import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs'; // IMPORTANTE: Agregados of y delay
import { environment } from '../../../environments/environment';

export interface ResultadoActividad {
  actividadId: number;
  respuestasCorrectas: number;
  totalPreguntas: number;
  completado: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades`;

  guardarResultado(resultado: ResultadoActividad): Observable<void> {
    /* --- INICIO MOCK GUARDADO ---
    console.warn('⚠️ ATENCIÓN: Guardado de actividad mockeado (Modo Desarrollo)', resultado);
    return of(undefined).pipe(delay(800)); // Simula que el guardado tardó 0.8s
    --- FIN MOCK GUARDADO --- */

    /* --- CÓDIGO REAL (Descomentar cuando el back funcione) --- */
    return this.http.post<void>(`${this.apiUrl}/resultados`, resultado);
  }
}