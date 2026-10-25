import { environment } from '../../../environments/environment';

// URLs que ya traen protocolo (https://, data:, blob:) o son protocol-relative (//cdn...)
const URL_ABSOLUTA = /^([a-z][a-z\d+\-.]*:|\/\/)/i;

/**
 * El back devuelve rutas relativas a su propio origen (ej: "/images/x.webp").
 * Si el navegador las resuelve contra el origen del front (localhost:4200) no las encuentra,
 * por eso se les antepone environment.backendUrl. Las URLs absolutas quedan igual.
 */
export function resolverUrlBackend(url: string | null | undefined, base = environment.backendUrl): string {
  if (!url) return '';
  if (URL_ABSOLUTA.test(url)) return url;
  const baseSinBarra = base.replace(/\/+$/, '');
  const ruta = url.startsWith('/') ? url : `/${url}`;
  return `${baseSinBarra}${ruta}`;
}
