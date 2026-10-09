// src/testing/datos-de-prueba.ts
// Helper 3 · Factories de datos: un objeto válido por defecto;
// cada test cambia solo el campo que le importa.
//
// Uso:
//   crearPerfilDto()                        // perfil de GRUPO completo
//   crearPerfilDto({ role: 'USUARIO' })     // mismo perfil, otro rol
//   crearPerfilDto({ redes: [] })           // caso límite: sin redes
//
// Los usuarios (id, email, nombre, rol) NO se repiten acá: se toman de
// sesion-de-prueba.helper.ts, así el perfil y la sesión describen a la misma persona.
 import { LoginRequest, UsuarioCreateRequest } from '../app/core/models/auth.model';
import { USUARIO_PRUEBA } from './sesion-de-prueba.helper';

/** Contraseña válida para formularios (8–20 caracteres). */
export const CLAVE_PRUEBA = 'Clave2026!';

/** PerfilResponseDTO (GET /auth/usuarios/perfil/mi-perfil y /{id}/perfil). */

/** Cuerpo de POST /auth/login. */
export function crearLoginRequest(cambios: Partial<LoginRequest> = {}): LoginRequest {
  return { username: USUARIO_PRUEBA.email, password: CLAVE_PRUEBA};
}

/** Cuerpo de POST /auth/register/usuario. */
export function crearRegistroUsuario(cambios: Partial<UsuarioCreateRequest> = {}): UsuarioCreateRequest {
  return {
  // Usuario que todavía no existe: datos propios, no los de sesion-de-prueba
  username: 'nuevo@gmail.com',
  password: CLAVE_PRUEBA,
  nombre: '',
  localidadId: 0
};
}
