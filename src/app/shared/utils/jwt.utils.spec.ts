import { decodeJwtPayload, getUserFromToken, isTokenExpired } from './jwt.utils';
import { crearTokenDePrueba,  GRUPO_PRUEBA } from '../../../testing/sesion-de-prueba.helper';

describe('jwt.utils', () => {
  // Reloj fijo: los casos límite no dependen de cuándo corre el test
/*  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());
*/
  describe('isTokenExpired', () => {
    it('con exp en 1 hora → no está vencido', () => {
      // Arrange
      const token = crearTokenDePrueba(GRUPO_PRUEBA, 3600);
      // Act
      const vencido = isTokenExpired(token);
      // Assert
      expect(vencido).toBe(false);
    });

    it.each([
      { segundos: -60, vencido: true },   // ya venció
      { segundos: 29, vencido: true },    // dentro del margen de 30 s
      { segundos: 31, vencido: false },   // fuera del margen
      { segundos: 3600, vencido: false },
    ])('exp en $segundos s → vencido: $vencido', ({ segundos, vencido }) => {
      const token = crearTokenDePrueba(GRUPO_PRUEBA, segundos);
      expect(isTokenExpired(token)).toBe(vencido);
    });
  });

  describe('decodeJwtPayload', () => {
    it.each([
      '',         // vacío
      'no-es-jwt', // sin puntos
      'a.b',      // solo 2 partes
      'a.@@@.c',  // payload no es Base64
    ])('token "%s" → null y se considera vencido', (token) => {
      expect(decodeJwtPayload(token)).toBeNull();
      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe('getUserFromToken', () => {
    it('token válido → arma el User con los claims', () => {
      const user = getUserFromToken(crearTokenDePrueba(GRUPO_PRUEBA));
      expect(user).toEqual({
        id: 7, username: 'lacuadrilla@gmail.com', name: 'La Cuadrilla', role: 'GRUPO',
      });
    });

    it('token malformado → null', () => {
      expect(getUserFromToken('no-es-jwt')).toBeNull();
    });
  });
});
