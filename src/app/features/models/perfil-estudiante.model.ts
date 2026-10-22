export interface PerfilEstudiante {
  id: number;
  nombre: string;
  apellido: string;
  fotoUrl?: string | null;
  curso: string | null;
  condiciones: string[];
  mensaje: string | null;
}

export interface EstudianteResumen {
  id: number;
  nombre: string;
  apellido: string;
  curso: string | null;
}