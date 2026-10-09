// src/testing/dom.ts
// Helper 2 · Interacción con el DOM como lo hace el usuario:
// por texto visible, id de input y role="alert"; nunca por clases CSS ni por posición.
//
// Uso:
//   const dom = () => fixture.nativeElement as HTMLElement;
//   escribir(dom(), '#username', 'grupo@gmail.com');   // Arrange
//   await clic(fixture, 'Ingresar');                     // Act
//   expect(alertas(dom())).toContain('...');             // Assert
import { ComponentFixture } from '@angular/core/testing';

/** Busca un botón por su texto visible o su aria-label. Si no existe, falla con un mensaje claro. */
export function botonPorTexto(raiz: HTMLElement, texto: string): HTMLButtonElement {
  const boton = Array.from(raiz.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(texto) || b.getAttribute('aria-label') === texto,
  );
  if (!boton) {
    throw new Error(`No se encontró un botón con el texto "${texto}"`);
  }
  return boton;
}

/** true si existe un botón con ese texto. Sirve para verificar que algo NO se muestra. */
export function existeBoton(raiz: HTMLElement, texto: string): boolean {
  return Array.from(raiz.querySelectorAll('button')).some((b) => b.textContent?.includes(texto));
}

/** Hace clic en un botón y espera a que Angular termine de actualizar (zoneless). */
export async function clic(fixture: ComponentFixture<unknown>, texto: string): Promise<void> {
  botonPorTexto(fixture.nativeElement as HTMLElement, texto).click();
  await fixture.whenStable();
}

/** Escribe en un input o textarea y dispara los eventos que escuchan los Reactive Forms. */
export function escribir(raiz: HTMLElement, selector: string, valor: string): void {
  const campo = raiz.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!campo) {
    throw new Error(`No se encontró el campo "${selector}"`);
  }
  campo.value = valor;
  campo.dispatchEvent(new Event('input')); // actualiza el FormControl
  campo.dispatchEvent(new Event('blur'));  // lo marca como touched (muestra errores)
}

/** Elige una opción de un <select> y dispara change. */
export function elegir(raiz: HTMLElement, selector: string, valor: string): void {
  const select = raiz.querySelector<HTMLSelectElement>(selector);
  if (!select) {
    throw new Error(`No se encontró el select "${selector}"`);
  }
  select.value = valor;
  select.dispatchEvent(new Event('change'));
}

/** Textos de todos los mensajes con role="alert", sin espacios de más. */
export function alertas(raiz: HTMLElement): string[] {
  return Array.from(raiz.querySelectorAll('[role="alert"]')).map((a) => a.textContent?.trim() ?? '');
}

/** Texto visible de toda la pantalla (para toContain). */
export function textoVisible(raiz: HTMLElement): string {
  return raiz.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
