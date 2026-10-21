export interface TipoActividadDTO {
  id?: number;
  nombre?: string;
  codigo?: string;
}

export interface ActividadCarpetaDTO {
  tareaId: number;
  actividadId: number;
  titulo: string;
  tipoActividad?: TipoActividadDTO;
  imagenUrl?: string;
  fechaAsignacion: string;
  estado: string;
  realizada: boolean;
  esHoy: boolean;
}

export interface MateriaInicioDTO {
  carpetaEspacioId: number;
  espacioCurricularId: number;
  nombre: string;
  color?: string;
  icono?: string;
  etiqueta?: string;
  horaInicio?: string; 
  horaFin?: string;    
  actividadPrincipal?: ActividadCarpetaDTO | null;
  otrasPendientes?: ActividadCarpetaDTO[];
  mensaje?: string;
}

export interface InicioDTO {
  hayClaseAhora: boolean;
  mensaje?: string;
  materias: MateriaInicioDTO[];
}

// Esta es la interfaz que te marca como faltante:
export interface ActividadesMateriaDTO {
  carpetaEspacioId: number;
  materia: string;
  color?: string;
  icono?: string;
  mensaje?: string;
  actividades: ActividadCarpetaDTO[];
}

export interface MateriaCarpetaDTO {
  carpetaEspacioId: number;
  espacioCurricularId: number;
  nombre: string;
  color?: string;
  icono?: string;
  etiqueta?: string;
  horaInicio?: string;
  horaFin?: string;
}

export interface MiCarpetaDTO {
  materiaActual?: MateriaCarpetaDTO | null;
  materias: MateriaCarpetaDTO[];
  mensaje?: string;
}