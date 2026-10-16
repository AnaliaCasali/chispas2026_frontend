import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, delay, of, tap } from 'rxjs'; // IMPORTANTE: Agregados of y delay

import {
  AuthResponse,
  CambiarPasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  UsuarioCreateRequest,
} from '../models/auth.model';
import { JwtPayload } from '../models/jwt-payload.model';
import { Role, User } from '../models/user';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http        = inject(HttpClient);
  private router      = inject(Router);
  private esBrowser   = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly API_URL   = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'rcc_token';
  private readonly USER_KEY  = 'rcc_user';

  public token       = signal<string | null>(this.leerStorage(this.TOKEN_KEY));
  public currentUser = signal<User | null>(this.getUserFromStorage());

  public isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  public userRole        = computed(() => this.currentUser()?.role ?? null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    // --- INICIO MOCK LOGIN ---
    console.warn('⚠️ ATENCIÓN: Usando Login Mockeado (Modo Desarrollo)');
    
    // Generamos un payload falso válido que no expirará pronto y tiene rol ESTUDIANTE
    const fakePayload = {
      id: 99,
      sub: credentials.username || '12345678',
      name: 'Estudiante',
      surname: 'De Prueba',
      rol: 'ESTUDIANTE',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // Expira en 1 hora
    };

    // Función para convertir a Base64URL (lo que espera el JWT decoder)
    const base64url = (obj: any) =>
      btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const fakeToken = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(fakePayload)}.firma_falsa`;

    return of({ token: fakeToken }).pipe(
      delay(1000), // Simulamos 1 segundo de latencia de red
      tap(res => this.saveSession(res.token))
    );
    // --- FIN MOCK LOGIN ---

    /* --- CÓDIGO REAL (Descomentar cuando el back funcione) ---
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(tap(res => this.saveSession(res.token)));
    ----------------------------------------------------------- */
  }

  registrarUsuario(datos: UsuarioCreateRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register/usuario`, datos)
      .pipe(tap(res => this.saveSession(res.token)));
  }

  cambiarPassword(datos: CambiarPasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/usuarios/cambiar-password`, datos);
  }

  solicitarRecuperacion(datos: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/forgot-password`, datos);
  }

  restablecerPassword(datos: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/reset-password`, datos);
  }

  logout(): void {
    this.borrarStorage(this.TOKEN_KEY);
    this.borrarStorage(this.USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(requiredRoles: Role[]): boolean {
    const role = this.userRole();
    return role ? requiredRoles.includes(role) : false;
  }

  getEmail(): string | null  { return this.getPayload()?.sub  ?? null; }
  getNombre(): string | null { return this.getPayload()?.name ?? null; }
  getRol(): string | null { return this.userRole() ?? null;}
  getId(): number | null     { return this.getPayload()?.id   ?? null; }

  private saveSession(token: string): void {
    const user = this.buildUserFromToken(token);
    if (!user) throw new Error('Token JWT inválido o malformado');
    this.guardarStorage(this.TOKEN_KEY, token);
    this.guardarStorage(this.USER_KEY, JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }

  private getUserFromStorage(): User | null {
    try {
      const raw = this.leerStorage(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      this.borrarStorage(this.USER_KEY);
      return null;
    }
  }

  private buildUserFromToken(token: string): User | null {
    const payload = this.getPayload(token);
    if (!payload) return null;
    return {
      id:       payload.id,
      username: payload.sub,
      name:     payload.name,
      apellido: payload.surname,
      role:     payload.rol as Role,
    };
  }

  private getPayload(token?: string): JwtPayload | null {
    const jwt = token ?? this.token();
    if (!jwt) return null;
    try {
      const base64 = jwt.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  private leerStorage(key: string): string | null {
    return this.esBrowser ? localStorage.getItem(key) : null;
  }

  private guardarStorage(key: string, value: string): void {
    if (this.esBrowser) localStorage.setItem(key, value);
  }

  private borrarStorage(key: string): void {
    if (this.esBrowser) localStorage.removeItem(key);
  }
}