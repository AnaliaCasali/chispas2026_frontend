export interface User {
  id: number;
  username: string; // email o DNI
  name: string;
  apellido: string; 
  role: Role;
  fotoUrl?: string;
}

export enum Role {
  ESTUDIANTE = 'ESTUDIANTE',
  DOCENTE = 'DOCENTE',
  PRECEPTOR = 'PRECEPTOR',
  ADMIN = 'ADMIN'
}
