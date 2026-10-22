export interface CapacidadEstudiante {
  area: string;
  pregunta: string;
  respuesta: boolean;
}

export interface PerfilEstudiante {
  id: number;
  nombre: string;
  apellido: string;
  fotoUrl?: string | null;
  curso: string | null;
  condiciones: string[];
  mensaje: string | null;
  observaciones?: string | null;       // cuando el back lo agregue
  capacidades?: CapacidadEstudiante[]; // cuando el back lo agregue
}