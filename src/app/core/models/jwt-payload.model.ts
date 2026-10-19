// Claims del token que arma el JwtService del back
export interface JwtPayload {
  id: number;
  name: string;
  surname: string;
  sub: string;   // email del usuario
  rol: string;   // "USUARIO", "GRUPO" u "ORGANIZADOR" (Role del back)
  iat: number;
  exp: number;   // en segundos
}
