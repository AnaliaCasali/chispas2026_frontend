import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClaseActualResponse } from '../models/clase-actual.model';

@Injectable({
  providedIn: 'root'
})
export class InicioService {
  private clienteHttp = inject(HttpClient);
  private urlApi = 'http://localhost:8080/api/dashboard/clase-actual';

  obtenerClaseActual(): Observable<ClaseActualResponse> {
    return this.clienteHttp.get<ClaseActualResponse>(this.urlApi);
  }
}