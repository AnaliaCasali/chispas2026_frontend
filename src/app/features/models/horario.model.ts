export interface ClaseHorarioDTO {
  carpetaEspacioId: number;
  espacioCurricularId: number;
  materia: string;
  color: string;
  icono?: string;
  horaInicio: string;
  horaFin: string;
  ahora: boolean;
}

export interface MiHorarioDTO {
  dia: string | null;
  mensaje?: string;
  clases: ClaseHorarioDTO[];
}