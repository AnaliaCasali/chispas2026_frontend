# Chispas 2026 — Frontend

Aplicación web de **Chispas**, la plataforma del IES 63 para que docentes y estudiantes trabajen con carpetas, tareas, horarios y actividades.

- **Producción:** https://chispas.ies63lastoscas.edu.ar
- **Backend:** [chispas2026_backend](https://github.com/AnaliaCasali/chispas2026_backend)

## Tecnologías

- Angular 22 con SSR (`@angular/ssr` y Express)
- Tests con Vitest y cobertura con `@vitest/coverage-v8`
- Docker, con imagen publicada en GitHub Container Registry

## Requisitos

- Node.js 22 y npm
- El backend corriendo en http://localhost:8080 (ver el README del backend)

## Correr en local

```bash
npm ci
npm start          # ng serve
```

Abrir http://localhost:4200. La app se recarga sola al guardar cambios.

## Configuración

La URL de la API se define en `src/environments/`:

| Archivo | Se usa en | `apiUrl` |
|---|---|---|
| `environment.development.ts` | `ng serve` | `http://localhost:8080/api/v1` |
| `environment.production.ts` | `ng build` (producción) | `https://chispas.ies63lastoscas.edu.ar/api/v1` |

En producción el servidor SSR solo acepta el host `chispas.ies63lastoscas.edu.ar` (`allowedHosts` en `angular.json` y `NG_ALLOWED_HOSTS` en el contenedor).

## Tests

```bash
npx ng test --watch=false --coverage
```

`npm test` también funciona, pero queda en modo watch. El reporte de cobertura queda en `coverage/`.

## Build

```bash
npm run build
npm run serve:ssr:chispas2026_frontend   # sirve el build SSR en http://localhost:4000
```

## Rutas principales

| Ruta | Pantalla |
|---|---|
| `/bienvenida`, `/login` | Bienvenida e inicio de sesión |
| `/inicio` | Inicio |
| `/mi-carpeta` | Carpeta y materias (`/mi-carpeta/materias/:id/actividades`) |
| `/horarios` | Horario |
| `/estudiante` | Perfil del estudiante |
| `/actividad/ordenar`, `/actividad/unir-con-flechas` | Actividades interactivas |

## Estructura

```
src/app/
├── core/       guards, interceptores, modelos y servicios compartidos
├── features/   pantallas (login, actividades, componentes, ...)
└── shared/     componentes reutilizables
```

## CI/CD y deploy

- **`.github/workflows/ci.yml` (CI/CD):** en cada push y pull request corre los tests con cobertura y el build. Al mergear a `main`, además publica la imagen en `ghcr.io/analiacasali/chispas2026_frontend`.
- **`.github/workflows/deploy.yml`:** cuando el CI termina bien en `main`, entra por SSH al servidor y ejecuta `deploy.sh front`, que baja la imagen nueva y reinicia el contenedor.
- **Configuración del servidor:** el `compose.yaml` del servidor y `deploy.sh` están en la carpeta `deploy/` del repo del backend.
- **Imagen Docker:** Node 22, sirve el SSR en el puerto 4000 y no corre como root.
