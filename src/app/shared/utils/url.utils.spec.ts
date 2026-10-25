import { resolverUrlBackend } from './url.utils';

describe('resolverUrlBackend', () => {
  const base = 'http://localhost:8080';

  it('antepone la base del back a una ruta relativa', () => {
    expect(resolverUrlBackend('/images/don-quijote-molino.webp', base))
      .toBe('http://localhost:8080/images/don-quijote-molino.webp');
  });

  it('agrega la barra si la ruta no la trae', () => {
    expect(resolverUrlBackend('images/a.webp', base)).toBe('http://localhost:8080/images/a.webp');
  });

  it('no duplica la barra si la base termina en /', () => {
    expect(resolverUrlBackend('/images/a.webp', 'http://localhost:8080/')).toBe('http://localhost:8080/images/a.webp');
  });

  it('deja igual las URLs absolutas', () => {
    expect(resolverUrlBackend('https://picsum.photos/seed/x/400/600', base)).toBe('https://picsum.photos/seed/x/400/600');
    expect(resolverUrlBackend('data:image/png;base64,AAA', base)).toBe('data:image/png;base64,AAA');
    expect(resolverUrlBackend('//cdn.ejemplo.com/a.png', base)).toBe('//cdn.ejemplo.com/a.png');
  });

  it('con base vacía (mismo origen en producción) deja la ruta relativa', () => {
    expect(resolverUrlBackend('/images/a.webp', '')).toBe('/images/a.webp');
  });

  it('devuelve cadena vacía si no hay URL', () => {
    expect(resolverUrlBackend(null, base)).toBe('');
    expect(resolverUrlBackend(undefined, base)).toBe('');
  });
});
