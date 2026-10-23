import {
  AuthResponse,
  CambiarPasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  UsuarioCreateRequest,
} from '../app/core/models/auth.model';
import {
  EntregaRequestDTO,
  ItemRespuestaDTO,
  ResultadoTareaDTO,
} from '../app/core/services/actividad.service';
import {
  ESTUDIANTE_PRUEBA,
  crearTokenDePrueba,
} from './sesion-de-prueba.helper';
import {
  ItemActividadDTO,
  TareaDetalleDTO,
  HistorialTareaDTO,
  IntentoResumenDTO,
} from '../app/core/services/actividad.service';
import {
  ActividadCarpetaDTO,
  MateriaInicioDTO,
  InicioDTO,
} from '../app/features/models/inicio.model';
import { ActividadesMateriaDTO } from '../app/features/models/inicio.model';
import { ClaseHorarioDTO, MiHorarioDTO } from '../app/features/models/horario.model';

export const CLAVE_PRUEBA = 'Chispas2026';

// --- FACTORIES EXISTENTES ---

export function crearLoginRequest(cambios: Partial<LoginRequest> = {}): LoginRequest {
  return { username: ESTUDIANTE_PRUEBA.username, password: CLAVE_PRUEBA, ...cambios };
}

export function crearRegistroUsuario(cambios: Partial<UsuarioCreateRequest> = {}): UsuarioCreateRequest {
  return {
    dni: '99999999',
    email: 'nuevo@chispas.edu.ar',
    password: CLAVE_PRUEBA,
    nombre: 'Nuevo',
    apellido: 'Usuario',
    rol: 'ESTUDIANTE',
    ...cambios,
  };
}



// --- NUEVAS FACTORIES ---

/** Respuesta de autenticación con token JWT (POST /auth/login y POST /auth/register/usuario). */
export function crearAuthResponse(cambios: Partial<AuthResponse> = {}): AuthResponse {
  return {
    token: crearTokenDePrueba(ESTUDIANTE_PRUEBA),
    ...cambios,
  };
}

/** Petición para cambio de contraseña (PATCH /auth/usuarios/cambiar-password). */
export function crearCambiarPasswordRequest(
  cambios: Partial<CambiarPasswordRequest> = {},
): CambiarPasswordRequest {
  return {
    currentPassword: CLAVE_PRUEBA,
    newPassword: 'NuevaClave2026!',
    confirmationPassword: 'NuevaClave2026!',
    ...cambios,
  };
}

/** Petición para solicitar recuperación de contraseña (POST /auth/forgot-password). */
export function crearForgotPasswordRequest(
  cambios: Partial<ForgotPasswordRequest> = {},
): ForgotPasswordRequest {
  return {
    email: 'mariel.linera@chispas.edu.ar',
    ...cambios,
  };
}

/** Petición para restablecer contraseña con token (POST /auth/reset-password). */
export function crearResetPasswordRequest(
  cambios: Partial<ResetPasswordRequest> = {},
): ResetPasswordRequest {
  return {
    token: 'token-recuperacion-uuid-valido',
    newPassword: 'NuevaClave2026!',
    confirmationPassword: 'NuevaClave2026!',
    ...cambios,
  };
}

/** Item individual de respuesta a una actividad (POST /tareas/:id/entrega). */
export function crearItemRespuestaDto(
  cambios: Partial<ItemRespuestaDTO> = {},
): ItemRespuestaDTO {
  return {
    itemId: 101,
    posicionElegida: 1,
    itemUnidoId: null,
    ...cambios,
  };
}

/** Lista de items de respuesta desordenados a propósito para probar entregas. */
export function crearItemsRespuestaDto(cantidad = 3): ItemRespuestaDTO[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    itemId: 100 + (cantidad - i), // Desordenados intencionalmente
    posicionElegida: i + 1,
    itemUnidoId: 200 + i,
  }));
}

/** Solicitud de entrega de actividad (POST /tareas/:id/entrega). */
export function crearEntregaRequestDto(
  cambios: Partial<EntregaRequestDTO> = {},
): EntregaRequestDTO {
  return {
    items: crearItemsRespuestaDto(3),
    ...cambios,
  };
}

/** Resultado emitido tras evaluar la entrega de una tarea (POST /tareas/:id/entrega). */
export function crearResultadoTareaDto(
  cambios: Partial<ResultadoTareaDTO> = {},
): ResultadoTareaDTO {
  return {
    tareaId: 1,
    aciertos: 3,
    totalItems: 3,
    mensaje: '¡Excelente trabajo! Has completado la actividad correctamente.',
    estado: 'Realizada',
    puedeIntentar: false,
    ...cambios,
  };
}

/** Item individual con imagen para ordenar o unir (GET /tareas/:id). */
export function crearItemActividadDto(
  cambios: Partial<ItemActividadDTO> = {},
): ItemActividadDTO {
  return {
    itemId: 1,
    imagenUrl: 'http://localhost:8080/images/don-quijote-leyendo.webp',
    textoAlt: 'Don Quijote leyendo',
    titulo: 'Don Quijote lee un libro',
    lado: 'IZQ',
    posicion: null,
    ...cambios,
  };
}

/**
 * Lista de items para actividades.
 * Devuelve items desordenados a propósito para probar el tablero desordenado.
 */
export function crearItemsActividadDto(
  tipo: 'ORDENAR' | 'UNIR_FLECHAS' = 'ORDENAR',
): ItemActividadDTO[] {
  if (tipo === 'ORDENAR') {
    // 4 imágenes desordenadas intencionalmente
    return [
      { itemId: 2, imagenUrl: 'http://localhost:8080/images/img2.webp', textoAlt: 'Sale de casa', titulo: 'Sale de su casa', posicion: null },
      { itemId: 1, imagenUrl: 'http://localhost:8080/images/img1.webp', textoAlt: 'Lee un libro', titulo: 'Don Quijote lee', posicion: null },
      { itemId: 4, imagenUrl: 'http://localhost:8080/images/img4.webp', textoAlt: 'Vuelve a casa', titulo: 'Vuelve a casa', posicion: null },
      { itemId: 3, imagenUrl: 'http://localhost:8080/images/img3.webp', textoAlt: 'Ve molinos', titulo: 'Ve Molinos', posicion: null },
    ];
  }

  // UNIR_FLECHAS: 4 items IZQ y 4 items DER desordenados
  return [
    { itemId: 10, imagenUrl: 'http://localhost:8080/images/img10.webp', textoAlt: 'Leyendo', titulo: 'Don Quijote lee un libro', lado: 'IZQ', posicion: 1 },
    { itemId: 11, imagenUrl: 'http://localhost:8080/images/img11.webp', textoAlt: 'Saliendo', titulo: 'Don Quijote sale de casa', lado: 'IZQ', posicion: 2 },
    { itemId: 12, imagenUrl: 'http://localhost:8080/images/img12.webp', textoAlt: 'Molino', titulo: 'Don Quijote ve un molino', lado: 'IZQ', posicion: 3 },
    { itemId: 13, imagenUrl: 'http://localhost:8080/images/img13.webp', textoAlt: 'Volviendo', titulo: 'Don Quijote vuelve a casa', lado: 'IZQ', posicion: 4 },
    { itemId: 101, imagenUrl: '', textoAlt: '', titulo: 'Don Quijote sale de casa', lado: 'DER', posicion: 1 },
    { itemId: 102, imagenUrl: '', textoAlt: '', titulo: 'Don Quijote ve un molino', lado: 'DER', posicion: 2 },
    { itemId: 103, imagenUrl: '', textoAlt: '', titulo: 'Don Quijote lee un libro', lado: 'DER', posicion: 3 },
    { itemId: 104, imagenUrl: '', textoAlt: '', titulo: 'Don Quijote vuelve a casa', lado: 'DER', posicion: 4 },
  ];
}

/** Detalle completo de una tarea y sus items (GET /tareas/:id). */
export function crearTareaDetalleDto(
  cambios: Partial<TareaDetalleDTO> = {},
): TareaDetalleDTO {
  return {
    tareaId: 1,
    estado: 'Pendiente',
    realizada: false,
    materia: {
      carpetaEspacioId: 3,
      nombre: 'Lengua y Literatura',
      color: '#2563eb',
      icono: 'book',
    },
    contenido: {
      contenidoId: 1,
      titulo: 'Don Quijote de la Mancha',
      portadaUrl: 'http://localhost:8080/images/quijote-portada.webp',
    },
    actividadId: 1,
    titulo: 'Don Quijote de la Mancha',
    consigna: 'Arrastrá o tocá las imágenes para colocarlas en el orden correcto',
    tipoActividad: {
      codigo: 'ORDENAR',
      nombre: 'Ordenar la historia',
    },
    items: crearItemsActividadDto('ORDENAR'),
    ...cambios,
  };
}

/** Resumen de un intento individual de una tarea (GET /tareas/:id/resultado). */
export function crearIntentoResumenDto(
  cambios: Partial<IntentoResumenDTO> = {},
): IntentoResumenDTO {
  return {
    intento: 1,
    aciertos: 3,
    total: 4,
    ...cambios,
  };
}

/** Historial de intentos y último resultado de una tarea (GET /tareas/:id/resultado). */
export function crearHistorialTareaDto(
  cambios: Partial<HistorialTareaDTO> = {},
): HistorialTareaDTO {
  return {
    tareaId: 1,
    estado: 'Realizada',
    ultimoResultado: {
      tareaId: 1,
      aciertos: 4,
      totalItems: 4,
      mensaje: '¡Felicitaciones respondiste todo correctamente!',
      estado: 'Realizada',
      puedeIntentar: false,
    },
    ultimoIntento: 2,
    totalIntentos: 2,
    intentos: [
      crearIntentoResumenDto({ intento: 1, aciertos: 2, total: 4 }),
      crearIntentoResumenDto({ intento: 2, aciertos: 4, total: 4 }),
    ],
    ...cambios,
  };
}


export function crearClaseHorarioDTO(cambios: Partial<ClaseHorarioDTO> = {}): ClaseHorarioDTO {
  return {
    carpetaEspacioId: 10,
    espacioCurricularId: 1,
    materia: 'Lengua y Literatura',
    color: '#2563eb',
    icono: 'book',
    horaInicio: '08:45:00',
    horaFin: '09:30:00',
    ahora: false,
    ...cambios,
  };
}

export function crearMiHorarioDTO(cambios: Partial<MiHorarioDTO> = {}): MiHorarioDTO {
  return {
    dia: 'LUNES',
    mensaje: '',
    clases: [
      crearClaseHorarioDTO({
        carpetaEspacioId: 10,
        espacioCurricularId: 1,
        materia: 'Lengua y Literatura',
        horaInicio: '08:45:00',
        horaFin: '09:30:00',
        ahora: true,
      }),
      crearClaseHorarioDTO({
        carpetaEspacioId: 11,
        espacioCurricularId: 2,
        materia: 'Matemática',
        color: '#f43f5e',
        horaInicio: '09:30:00',
        horaFin: '10:15:00',
        ahora: false,
      }),
    ],
    ...cambios,
  };
}

/** Representa una actividad o tarea de una materia (GET /api/v1/inicio). */
export function crearActividadCarpetaDTO(
  cambios: Partial<ActividadCarpetaDTO> = {}
): ActividadCarpetaDTO {
  return {
    tareaId: 101,
    actividadId: 201,
    titulo: 'Lectura comprensiva: Capítulo 3',
    tipoActividad: { id: 1, nombre: 'Lectura', codigo: 'LEC' },
    fechaAsignacion: '2026-10-22',
    estado: 'PENDIENTE',
    realizada: false,
    esHoy: true,
    ...cambios,
  };
}

/** Representa una materia en la vista de inicio con su clase/actividad (GET /api/v1/inicio). */
export function crearMateriaInicioDTO(
  cambios: Partial<MateriaInicioDTO> = {}
): MateriaInicioDTO {
  return {
    carpetaEspacioId: 10,
    espacioCurricularId: 1,
    nombre: 'Lengua y Literatura',
    color: '#2563eb',
    icono: 'book',
    etiqueta: 'Clase Regular',
    horaInicio: '08:45:00',
    horaFin: '09:30:00',
    actividadPrincipal: crearActividadCarpetaDTO(),
    otrasPendientes: [],
    mensaje: undefined,
    ...cambios,
  };
}

/** Representa la respuesta general del endpoint de inicio (GET /api/v1/inicio). */
export function crearInicioDTO(
  cambios: Partial<InicioDTO> = {}
): InicioDTO {
  return {
    hayClaseAhora: true,
    mensaje: undefined,
    materias: [crearMateriaInicioDTO()],
    ...cambios,
  };
}

/** Representa el detalle de una materia con sus tareas asociadas (GET /api/v1/mi-carpeta/materias/:id/actividades). */
export function crearActividadesMateriaDTO(
  cambios: Partial<ActividadesMateriaDTO> = {}
): ActividadesMateriaDTO {
  return {
    carpetaEspacioId: 1,
    materia: 'Lengua y Literatura',
    color: '#2563eb',
    icono: 'book',
    mensaje: '',
    actividades: [
      crearActividadCarpetaDTO({
        tareaId: 10,
        actividadId: 1,
        titulo: 'Ordenar Don Quijote',
        realizada: false,
        estado: 'Pendiente',
        esHoy: true,
        tipoActividad: { id: 1, nombre: 'Ordenar', codigo: 'ORDENAR' },
      }),
      crearActividadCarpetaDTO({
        tareaId: 20,
        actividadId: 2,
        titulo: 'Unir con Flechas Quijote',
        realizada: true,
        estado: 'Realizada',
        esHoy: false,
        tipoActividad: { id: 2, nombre: 'Unir con Flechas', codigo: 'UNIR_FLECHAS' },
      }),
    ],
    ...cambios,
  };
}

/** Representa el historial de intentos y resultado de una tarea (GET /api/v1/tareas/:id/resultado). */
export function crearHistorialTareaDTO(
  cambios: Partial<HistorialTareaDTO> = {}
): HistorialTareaDTO {
  return {
    tareaId: 20,
    estado: 'Realizada',
    ultimoResultado: {
      tareaId: 20,
      aciertos: 4,
      totalItems: 4,
      mensaje: '¡Excelente trabajo!',
      estado: 'Realizada',
      puedeIntentar: true,
    },
    ultimoIntento: 1,
    totalIntentos: 1,
    intentos: [
      {
        intento: 1,
        aciertos: 4,
        total: 4,
      },
    ],
    ...cambios,
  };
}
