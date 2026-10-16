import { ApiError } from '../../core/interceptors/error-interceptor';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals para reactividad local
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required]],
  });

  get username() {
    return this.form.controls.username;
  }
  get password() {
    return this.form.controls.password;
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const credentials: LoginRequest = this.form.getRawValue();

    this.authService
      .login(credentials)
      .pipe(
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const destino =
            returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/inicio';
          this.router.navigateByUrl(destino);
        },
        error: (err: ApiError) => {
          this.errorMessage.set(this.obtenerMensajeError(err));
        },
      });
  }

  private obtenerMensajeError(err: ApiError): string {
    if (err.status === 401 || err.status === 403) {
      return 'Usuario/DNI o contraseña incorrectos.';
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Revisá tu conexión.';
    }
    return err.error?.message || 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
}