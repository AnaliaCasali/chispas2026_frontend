import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MiHorarioDTO } from '../models/horario.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HorarioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mi-horario`;

  obtenerMiHorario(): Observable<MiHorarioDTO> {
    return this.http.get<MiHorarioDTO>(this.apiUrl);
  }
}