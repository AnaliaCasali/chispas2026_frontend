import { Pipe, PipeTransform } from '@angular/core';
import { resolverUrlBackend } from '../utils/url.utils';

// Uso: <img [src]="item.imagenUrl | urlBackend">
@Pipe({ name: 'urlBackend' })
export class UrlBackendPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return resolverUrlBackend(url);
  }
}
