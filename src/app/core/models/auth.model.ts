export interface LoginRequest {
  username: string;   // email o DNI
  password: string;
}

// ---------------------------------------------------------------------------
// Registro — POST /api/v1/auth/register/usuario
// El rol lo asigna fijo el backend; nunca viene del cliente.
// ---------------------------------------------------------------------------

export interface UsuarioCreateRequest {
  dni: string;
  email?: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: string; 
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
