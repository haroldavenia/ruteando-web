import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  describe('acepta rutas internas', () => {
    const accepted: [string, string][] = [
      ['/journeys?page=2', '/journeys?page=2'],
      ['/journeys#detalle', '/journeys#detalle'],
      ['/places/abc123', '/places/abc123'],
      ['/', '/'],
      ['/acceso-nuevo', '/acceso-nuevo'], // no es una ruta de /acceso
      ['/%2F%2Fotro.example', '/%2F%2Fotro.example'], // codificado: sigue siendo una ruta interna
    ];
    for (const [input, expected] of accepted) {
      it(`${JSON.stringify(input)} -> ${expected}`, () => {
        expect(safeReturnUrl(input)).toBe(expected);
      });
    }
  });

  describe('sin valor útil da /', () => {
    for (const input of [null, undefined, '']) {
      it(`${String(input)}`, () => expect(safeReturnUrl(input)).toBe('/'));
    }
    it('una ruta relativa sin barra inicial', () => expect(safeReturnUrl('journeys')).toBe('/'));
  });

  describe('rechaza destinos externos o ambiguos (da /)', () => {
    const rejected: [string, string][] = [
      ['URL absoluta', 'https://otro.example/ruta'],
      ['URL absoluta http', 'http://otro.example'],
      ['mismo esquema con doble barra', '//otro.example'],
      ['doble barra con ruta', '//otro.example/journeys'],
      ['barra invertida pegada', '/\\otro.example'],
      ['barra invertida en medio', '/journeys\\..\\otro'],
      ['javascript:', 'javascript:alert(1)'],
      ['data:', 'data:text/html,<script>alert(1)</script>'],
      ['tabulador que el navegador elimina', '/\t/otro.example'],
      ['salto de línea', '/\n/otro.example'],
      ['retorno de carro', '/\r/otro.example'],
      ['espacio inicial', ' /journeys'],
      ['espacio dentro', '/jour neys'],
      ['carácter nulo', '/jour\u0000neys'],
      ['carácter de control DEL', '/jour\u007fneys'],
    ];
    for (const [name, input] of rejected) {
      it(`${name}: ${JSON.stringify(input)}`, () => expect(safeReturnUrl(input)).toBe('/'));
    }
  });

  describe('no vuelve a las pantallas de acceso (da /)', () => {
    for (const input of ['/acceso', '/acceso/registro', '/acceso?x=1', '/acceso#a', '/a/../acceso', '/journeys/../acceso/recuperar']) {
      it(input, () => expect(safeReturnUrl(input)).toBe('/'));
    }
  });
});
