export interface LoginRequest {
  username: string;   // es el email
  password: string;
}

// ---------------------------------------------------------------------------
// Registro — POST /api/v1/auth/register/{usuario|grupo|organizador}
// El rol lo asigna fijo el backend; nunca viene del cliente.
// ---------------------------------------------------------------------------

export interface UsuarioCreateRequest {
  username: string;     // email válido (@NotNull + @Email)
  password: string;     // entre 8 y 20 caracteres
  nombre: string;      // entre 2 y 100 caracteres
  biografia?: string;   // opcional, máximo 500 caracteres
  localidadId: number;  // ID existente en la tabla Localidad (@NotNull + @Positive)
}

export interface GrupoCreateRequest {
  username: string;
  password: string;
  nombre: string;
  biografia?: string;
  director?: string;   // igual que Organizador: el backend lo guarda (GrupoCreateDTO)
  localidadId: number;
}

export interface OrganizadorCreateRequest {
  username: string;
  password: string;
  nombre: string;
  biografia?: string;
  director?: string;
  localidadId: number;
}

export interface AuthResponse {
  token: string;
}

// ---------------------------------------------------------------------------
// Cambio de contraseña — PATCH /api/v1/auth/usuarios/cambiar-password (204 No Content)
// El usuario lo identifica el backend por el token.
// ---------------------------------------------------------------------------

export interface CambiarPasswordRequest {
  currentPassword: string;
  newPassword: string;          // mínimo 6 caracteres
  confirmationPassword: string;
}

// ---------------------------------------------------------------------------
// Olvidé mi contraseña — endpoints públicos (200 sin cuerpo)
// POST /api/v1/auth/forgot-password → el backend envía el enlace con el token
// POST /api/v1/auth/reset-password  → se cambia la contraseña con ese token
// ---------------------------------------------------------------------------

export interface ForgotPasswordRequest {
  email: string;                // email (o username) de la cuenta
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;          // mínimo 6 caracteres
  confirmationPassword: string;
}
