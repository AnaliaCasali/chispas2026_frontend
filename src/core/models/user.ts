export interface User
{ id: number; // = id
username: string; // = sub
name: string; // = name
role: Role; // = rol
}

export enum Role {
  USUARIO = 'USUARIO',
}
