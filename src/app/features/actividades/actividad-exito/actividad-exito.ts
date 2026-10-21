import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-actividad-exito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './actividad-exito.html',
  styleUrl: './actividad-exito.css'
})
export class ActividadExitoComponent {
  private router = inject(Router);

  // Inputs configurables
  visible = input<boolean>(false);
  titulo = input<string>('¡Excelente trabajo!');
  mensaje = input<string>('¡Has completado la actividad correctamente!');
  aciertos = input<number | null>(4);
  total = input<number | null>(4);
  guardando = input<boolean>(false);
  guardadoExitoso = input<boolean>(false);
  
  // Ruta de la actividad para asegurar la redirección (ej: '/actividad/ordenar')
  rutaActividad = input<string>('');

  // Eventos emitidos al padre
  guardar = output<void>();
  reiniciar = output<void>();
  continuar = output<void>();

  // 24 chispas decorativas
  chispas = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'][i % 6],
    rotacion: `${i * 15}deg`,
    distancia: `${70 + (i % 4) * 25}px`,
    retraso: `${(i % 5) * 0.08}s`,
    tamano: `${8 + (i % 3) * 4}px`
  }));

  onGuardar(): void {
    this.guardar.emit();
  }

  onReiniciar(): void {
    // 1. Emite evento para resetear el estado interno del juego
    this.reiniciar.emit();

    // 2. Redirige a la URL de la actividad completada si está definida
    if (this.rutaActividad()) {
      this.router.navigate([this.rutaActividad()]);
    }
  }

  onContinuar(): void {
    this.continuar.emit();
  }
}