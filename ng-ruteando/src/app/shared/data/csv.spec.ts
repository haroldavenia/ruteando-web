import { csvCell, downloadCsv, toCsv } from './csv';

describe('csv', () => {
  describe('csvCell', () => {
    it('deja pasar texto y números normales', () => {
      expect(csvCell('Calle 1')).toBe('Calle 1');
      expect(csvCell(4.60872)).toBe('4.60872');
      expect(csvCell(-74.07728)).toBe('-74.07728');
    });

    it('vacía null y undefined', () => {
      expect(csvCell(null)).toBe('');
      expect(csvCell(undefined)).toBe('');
    });

    it('entrecomilla textos con ;, comillas y saltos de línea, duplicando las comillas', () => {
      expect(csvCell('a;b')).toBe('"a;b"');
      expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""');
      expect(csvCell('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
      expect(csvCell('línea 1\r\nlínea 2')).toBe('"línea 1\r\nlínea 2"');
    });

    for (const prefix of ['=', '+', '-', '@', '\t', '\r']) {
      it(`antepone un apóstrofo al texto que empieza por ${JSON.stringify(prefix)}`, () => {
        expect(csvCell(`${prefix}CMD()`).replace(/^"|"$/g, '')).toBe(`'${prefix}CMD()`);
      });
    }

    it('un texto con prefijo peligroso y separador queda protegido y entrecomillado', () => {
      expect(csvCell('=A1;B1')).toBe(`"'=A1;B1"`);
    });

    it('un número negativo no es una fórmula y no se altera', () => {
      expect(csvCell(-5)).toBe('-5');
    });
  });

  describe('toCsv', () => {
    it('empieza por el BOM, usa ; y \\r\\n y termina con salto de línea', () => {
      const csv = toCsv(['A', 'B'], [['x', 1], ['y', null]]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv.slice(1)).toBe('A;B\r\nx;1\r\ny;\r\n');
    });

    it('sin filas deja solo la cabecera', () => {
      expect(toCsv(['A'], []).slice(1)).toBe('A\r\n');
    });
  });

  describe('downloadCsv', () => {
    it('no hace nada en el servidor', () => {
      const click = spyOn(HTMLAnchorElement.prototype, 'click');
      expect(downloadCsv('x.csv', 'a', 'server')).toBeFalse();
      expect(click).not.toHaveBeenCalled();
    });

    it('en el navegador crea un enlace de descarga con el nombre y el contenido', async () => {
      let download = '';
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        download = this.download;
      });
      let blob: Blob | null = null;
      spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => {
        blob = b as Blob;
        return 'blob:prueba';
      });
      expect(downloadCsv('paquetes.csv', toCsv(['A'], [['ñ']]), 'browser')).toBeTrue();
      expect(download).toBe('paquetes.csv');
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await (blob as unknown as Blob).arrayBuffer());
      expect(text.charCodeAt(0)).toBe(0xfeff);
      expect(text).toContain('ñ');
    });
  });
});
