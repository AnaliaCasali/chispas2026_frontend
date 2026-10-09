import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Captura errores globales no manejados (ErrorHandler nativo del navegador)
    provideBrowserGlobalErrorListeners(),

    // Modo Zoneless activo (reemplaza a Zone.js)
    provideZonelessChangeDetection(),

    // Router con input binding — permite recibir route params como @Input() / Input Signals
    provideRouter(routes, withComponentInputBinding()),

    // Hidratación SSR con Event Replay
    provideClientHydration(withEventReplay()),

    // HttpClient con interceptores registrados en orden
    provideHttpClient(
      withInterceptors([
        authInterceptor,  // 1° Agrega el Bearer Token en las peticiones
        errorInterceptor, // 2° Captura respuestas 401/403/500 globalmente
      ])
    ),
  ],
};
