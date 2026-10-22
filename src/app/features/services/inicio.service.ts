import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InicioDTO } from '../models/inicio.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class InicioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inicio`;

  obtenerInicio(): Observable<InicioDTO> {
    return this.http.get<InicioDTO>(this.apiUrl);
  }
}