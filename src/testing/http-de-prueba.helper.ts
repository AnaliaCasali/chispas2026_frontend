// src/testing/http-de-prueba.ts
// Helper 4 · Backend falso: providers comunes y respuestas en una línea.
// Se usa en el paso Act (responder) y Cleanup (verify) de tests con HTTP.
//
// Uso:
//   TestBed.configureTestingModule({ providers: providersDePrueba([authInterceptor]) });
//   http = TestBed.inject(HttpTestingController);
//   responder(http, 'GET', '/perfil/mi-perfil', crearPerfilDto());
//   responderError(http, 'POST', '/auth/register/usuario', 409);
//   responderSinConexion(http, 'POST', '/auth/login');
//   afterEach(() => http.verify());
import { EnvironmentProviders, Provider } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
// EDITADO: se suma withComponentInputBinding (igual que app.config.ts)
import { provideRouter, Routes, withComponentInputBinding } from '@angular/router';
import { environment } from '../environments/environment';

export const API = environment.apiUrl;

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Cuerpo = Parameters<TestRequest['flush']>[0];

/** Rutas mínimas: logout() navega a /login y el login exitoso a /inicio. */
const RUTAS_DE_PRUEBA: Routes = [
  { path: 'login', children: [] },
  { path: 'inicio', children: [] },
  { path: 'sugerencias', children: [] },
  { path: 'unauthorized', children: [] },
];

/**
 * Providers comunes de un test: router + HttpClient falso.
 * @param interceptores los que se quieren probar (por defecto ninguno)
 */
export function providersDePrueba(
  interceptores: HttpInterceptorFn[] = [],
  rutas: Routes = RUTAS_DE_PRUEBA,
): (Provider | EnvironmentProviders)[] {
  return [
    // EDITADO: mismo router que la app: los :params y ?query llegan a los inputs del componente
    provideRouter(rutas, withComponentInputBinding()),
    provideHttpClient(withInterceptors(interceptores)),
    provideHttpClientTesting(),
  ];
}

/** Busca UNA petición por método y final de URL. Si no está, el mensaje dice cuál faltó. */
export function peticion(http: HttpTestingController, metodo: Metodo, urlTermina: string): TestRequest {
  return http.expectOne(
    (r) => r.method === metodo && r.url.endsWith(urlTermina),
    `${metodo} …${urlTermina}`,
  );
}

/** Responde con éxito (200). Devuelve la petición para verificar req.request.body. */
export function responder(
  http: HttpTestingController, metodo: Metodo, urlTermina: string, cuerpo: Cuerpo,
): TestRequest {
  const req = peticion(http, metodo, urlTermina);
  req.flush(cuerpo);
  return req;
}

const TEXTO_STATUS: Record<number, string> = {
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 409: 'Conflict', 500: 'Internal Server Error',
};

/** Responde con un error HTTP (400, 401, 403, 404, 409, 500...). */
export function responderError(
  http: HttpTestingController, metodo: Metodo, urlTermina: string, status: number, cuerpo: Cuerpo = null,
): TestRequest {
  const req = peticion(http, metodo, urlTermina);
  req.flush(cuerpo, { status, statusText: TEXTO_STATUS[status] ?? 'Error' });
  return req;
}

/** Simula backend caído: HttpErrorResponse con status 0. */
export function responderSinConexion(http: HttpTestingController, metodo: Metodo, urlTermina: string): TestRequest {
  const req = peticion(http, metodo, urlTermina);
  req.error(new ProgressEvent('error'));
  return req;
}

/** Verifica que NO salió ninguna petición cuya URL contenga el texto. */
export function sinPeticiones(http: HttpTestingController, urlContiene: string): void {
  http.expectNone((r) => r.url.includes(urlContiene), `ninguna petición a …${urlContiene}`);
}
