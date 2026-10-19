import { JwtPayload } from "../../core/models/jwt-payload.model";
import { Role, User } from "../../core/models/user";


export function decodeJwtPayload(token: string): JwtPayload | null {
try {
const parts = token.split('.');
if (parts.length !== 3) return null; // Normalizar Base64url → Base64 estándar
           const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
           return JSON.parse(atob(base64)) as JwtPayload; }
 catch { return null; } }


export function isTokenExpired(token: string, marginSeconds = 30): boolean {
const payload = decodeJwtPayload(token);
if (!payload?.exp) return true; // ✅ Margen de 30s evita race conditions con el servidor
return (payload.exp * 1000) - (marginSeconds * 1000) < Date.now();
}
 // ✅ Construye el objeto User desde el payload del JWT
export function getUserFromToken(token: string): User | null {
const payload = decodeJwtPayload(token);
if (!payload) return null;
return {
id: payload.id,
username: payload.sub, // "sub": "grupo@gmail.com"
name: payload.name, // "name": "grupo test"
apellido: payload.surname,
role: payload.rol as Role, // "rol": "USER"
};
 }
