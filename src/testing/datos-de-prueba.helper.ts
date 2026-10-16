import { LoginRequest, UsuarioCreateRequest } from '../app/core/models/auth.model';
import { ESTUDIANTE_PRUEBA } from './sesion-de-prueba.helper';

export const CLAVE_PRUEBA = 'Chispas2026';

export function crearLoginRequest(cambios: Partial<LoginRequest> = {}): LoginRequest {
  return { username: ESTUDIANTE_PRUEBA.username, password: CLAVE_PRUEBA, ...cambios };
}

export function crearRegistroUsuario(cambios: Partial<UsuarioCreateRequest> = {}): UsuarioCreateRequest {
  return {
    dni: '99999999',
    email: 'nuevo@chispas.edu.ar',
    password: CLAVE_PRUEBA,
    nombre: 'Nuevo',
    apellido: 'Usuario',
    rol: 'ESTUDIANTE',
    ...cambios
  };
}