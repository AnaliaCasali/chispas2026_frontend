import { Role, User } from "../app/core/models/user";

export const CLAVE_TOKEN = 'rcc_token';
export const CLAVE_USUARIO = 'rcc_user';

export interface UsuarioPrueba {
  id: number;
  username: string; // DNI o Email
  nombre: string;
  apellido: string;
  rol: Role;
}

export const ESTUDIANTE_PRUEBA: UsuarioPrueba = {
  id: 2, username: '45123456', nombre: 'Mariel', apellido: 'Linera', rol: Role.ESTUDIANTE,
};

export const DOCENTE_PRUEBA: UsuarioPrueba = {
  id: 1, username: '20111222', nombre: 'Laura', apellido: 'Gómez', rol: Role.DOCENTE,
};

export function crearTokenDePrueba(usuario: UsuarioPrueba = ESTUDIANTE_PRUEBA, expEnSegundos = 3600): string {
  const ahora = Math.floor(Date.now() / 1000);
  const payload = {
    id: usuario.id,
    sub: usuario.username,
    name: usuario.nombre,
    surname: usuario.apellido,
    rol: usuario.rol,
    iat: ahora,
    exp: ahora + expEnSegundos,
  };
  
  const base64url = (obj: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.firma-de-prueba`;
}

export function crearUsuarioDe(usuario: UsuarioPrueba): User {
  return { id: usuario.id, username: usuario.username, name: usuario.nombre, apellido: usuario.apellido, role: usuario.rol };
}

export function iniciarSesionDePrueba(usuario: UsuarioPrueba = ESTUDIANTE_PRUEBA, expEnSegundos = 3600): void {
  localStorage.setItem(CLAVE_TOKEN, crearTokenDePrueba(usuario, expEnSegundos));
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(crearUsuarioDe(usuario)));
}

export function iniciarSesionCorrupta(): void {
  localStorage.setItem(CLAVE_TOKEN, crearTokenDePrueba());
  localStorage.setItem(CLAVE_USUARIO, '{json-roto');
}

export function cerrarSesionDePrueba(): void {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}