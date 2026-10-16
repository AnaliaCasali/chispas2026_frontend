import { decodeJwtPayload, getUserFromToken, isTokenExpired } from './jwt.utils';
import { crearTokenDePrueba,  ESTUDIANTE_PRUEBA } from '../../../testing/sesion-de-prueba.helper';

describe('jwt.utils', () => {
  describe('isTokenExpired', () => {
    it('con exp en 1 hora -> no está vencido', () => {
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA, 3600);
      const vencido = isTokenExpired(token);
      expect(vencido).toBe(false);
    });

    it.each([
      { segundos: -60, vencido: true },
      { segundos: 29, vencido: true },
      { segundos: 31, vencido: false },
      { segundos: 3600, vencido: false },
    ])('exp en $segundos s -> vencido: $vencido', ({ segundos, vencido }) => {
      const token = crearTokenDePrueba(ESTUDIANTE_PRUEBA, segundos);
      expect(isTokenExpired(token)).toBe(vencido);
    });
  });

  describe('decodeJwtPayload', () => {
    it.each([
      '',         
      'no-es-jwt', 
      'a.b',      
      'a.@@@.c',  
    ])('token "%s" -> null y se considera vencido', (token) => {
      expect(decodeJwtPayload(token)).toBeNull();
      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe('getUserFromToken', () => {
    it('token válido -> arma el User con los claims', () => {
      const user = getUserFromToken(crearTokenDePrueba(ESTUDIANTE_PRUEBA));
      expect(user).toEqual({
        id: 2, 
        username: '45123456', 
        name: 'Mariel', 
        apellido: 'Linera',
        role: 'ESTUDIANTE',
      });
    });

    it('token malformado -> null', () => {
      expect(getUserFromToken('no-es-jwt')).toBeNull();
    });
  });
});