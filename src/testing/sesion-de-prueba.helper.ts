// src/testing/sesion-de-prueba.helper.ts
// Helper 1 · Sesión falsa (JWT + localStorage).
// Se usa en el paso Arrange de cualquier test que necesite un usuario logueado.
//
// Uso:
//   iniciarSesionDePrueba();                    // GRUPO, token vigente 1 h
//   iniciarSesionDePrueba(USUARIO_PRUEBA);      // otro rol
//   iniciarSesionDePrueba(GRUPO_PRUEBA, -60);   // token vencido hace 60 s
//   afterEach(() => cerrarSesionDePrueba());

import { Role, User } from "../app/core/models/user";


/** Claves que usa AuthService. Si cambian en el servicio, se cambian solo acá. */
export const CLAVE_TOKEN = 'rcc_token';
export const CLAVE_USUARIO = 'rcc_user';

export interface UsuarioPrueba {
  id: number;
  email: string;
  nombre: string;
  rol: Role;
}

export const USUARIO_PRUEBA: UsuarioPrueba = {
  id: 12, email: 'juan@gmail.com', nombre: 'Juan Pereyra', rol: Role.USUARIO,
};

/**
 * JWT con los mismos claims que arma el JwtService del backend (id, sub, name, rol, exp).
 * La firma es falsa: el front no la verifica.
 * @param expEnSegundos segundos hasta el vencimiento; negativo = ya vencido
 */
export function crearTokenDePrueba(usuario: UsuarioPrueba =USUARIO_PRUEBA, expEnSegundos = 3600): string {
  const ahora = Math.floor(Date.now() / 1000);
  const payload = {
    id: usuario.id,
    sub: usuario.email,
    name: usuario.nombre,
    rol: usuario.rol,
    iat: ahora,
    exp: ahora + expEnSegundos,
  };
  // UTF-8 como el backend: btoa() solo acepta Latin-1 y rompería tildes y ñ
  const base64url = (obj: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.firma-de-prueba`;
}

/** Objeto User tal como lo guarda AuthService.saveSession(). */
export function crearUsuarioDe(usuario: UsuarioPrueba):User {
  return { id: usuario.id, username: usuario.email, name: usuario.nombre, role: usuario.rol };
}

/**
 * Guarda token y usuario en localStorage.
 * Llamar ANTES de crear el servicio o el componente: AuthService lee el storage una sola vez.
 */
export function iniciarSesionDePrueba(usuario: UsuarioPrueba = USUARIO_PRUEBA, expEnSegundos = 3600): void {
  localStorage.setItem(CLAVE_TOKEN, crearTokenDePrueba(usuario, expEnSegundos));
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(crearUsuarioDe(usuario)));
}

/** Caso límite: hay token pero el usuario guardado está corrupto. */
export function iniciarSesionCorrupta(): void {
  localStorage.setItem(CLAVE_TOKEN, crearTokenDePrueba());
  localStorage.setItem(CLAVE_USUARIO, '{json-roto');
}

/** Limpieza: va en afterEach de todo spec que use este helper. */
export function cerrarSesionDePrueba(): void {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}
