import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InicioDTO } from '../models/inicio.model';

@Injectable({
  providedIn: 'root'
})
export class InicioService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/v1/inicio';

  obtenerInicio(): Observable<InicioDTO> {
    return this.http.get<InicioDTO>(this.apiUrl);
  }
}