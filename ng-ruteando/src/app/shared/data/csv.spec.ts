import { csvCell, downloadCsv, parseCsv, toCsv } from './csv';

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

  describe('parseCsv', () => {
    it('lee un archivo sencillo con ; y devuelve el separador y las líneas', () => {
      const result = parseCsv('A;B\n1;2\n3;4\n');
      expect(result.rows).toEqual([['A', 'B'], ['1', '2'], ['3', '4']]);
      expect(result.lines).toEqual([1, 2, 3]);
      expect(result.delimiter).toBe(';');
      expect(result.truncated).toBeFalse();
    });

    for (const [name, delimiter] of [['coma', ','], ['punto y coma', ';'], ['tabulación', '\t']] as const) {
      it(`detecta el separador: ${name}`, () => {
        const result = parseCsv(`A${delimiter}B${delimiter}C\n1${delimiter}2${delimiter}3`);
        expect(result.delimiter).toBe(delimiter);
        expect(result.rows[1]).toEqual(['1', '2', '3']);
      });
    }

    it('con empate entre separadores usa ;', () => {
      expect(parseCsv('A\nB').delimiter).toBe(';');
    });

    it('ignora un separador que solo aparece dentro de comillas en la cabecera', () => {
      expect(parseCsv('"A,B";C\n1;2').delimiter).toBe(';');
    });

    it('quita el BOM, acepta CRLF, LF y CR y ignora las líneas vacías', () => {
      const result = parseCsv('﻿A;B\r\n\r\n1;2\r3;4\n\n');
      expect(result.rows).toEqual([['A', 'B'], ['1', '2'], ['3', '4']]);
    });

    it('lee comillas con separadores, saltos de línea y comillas escapadas dentro', () => {
      const result = parseCsv('A;B\n"x;y";"línea 1\nlínea 2"\n"dijo ""hola""";fin');
      expect(result.rows[1]).toEqual(['x;y', 'línea 1\nlínea 2']);
      expect(result.rows[2]).toEqual(['dijo "hola"', 'fin']);
    });

    it('la línea de un registro cuenta los saltos de línea de las comillas anteriores', () => {
      const result = parseCsv('A;B\n"a\nb";c\nx;y');
      expect(result.lines).toEqual([1, 2, 4]);
    });

    it('un archivo solo con cabecera da un solo registro', () => {
      expect(parseCsv('A;B;C').rows).toEqual([['A', 'B', 'C']]);
    });

    it('un archivo vacío no da registros', () => {
      expect(parseCsv('').rows).toEqual([]);
      expect(parseCsv('\n\n').rows).toEqual([]);
    });

    it('una comilla sin cerrar se avisa y no pierde el texto', () => {
      const result = parseCsv('A;B\n1;"sin cerrar\n2;3');
      expect(result.unterminatedQuote).toBeTrue();
      expect(result.rows[1][0]).toBe('1');
      expect(result.rows[1][1]).toContain('sin cerrar');
    });

    it('conserva celdas vacías y celdas entrecomilladas vacías', () => {
      expect(parseCsv('A;B;C\n;"";x').rows[1]).toEqual(['', '', 'x']);
    });

    it('no interpreta nada: fórmulas y etiquetas quedan como texto', () => {
      expect(parseCsv('A\n=1+1\n<script>x</script>').rows).toEqual([['A'], ['=1+1'], ['<script>x</script>']]);
    });

    describe('límite de filas', () => {
      const body = Array.from({ length: 10 }, (_, i) => `${i}`).join('\n');
      it('se detiene al superar el máximo de filas de datos', () => {
        const result = parseCsv(`A\n${body}`, { maxRows: 5 });
        expect(result.truncated).toBeTrue();
        expect(result.rows.length).toBe(1 + 5);
      });

      it('con exactamente el máximo no se trunca', () => {
        const result = parseCsv(`A\n${body}`, { maxRows: 10 });
        expect(result.truncated).toBeFalse();
        expect(result.rows.length).toBe(11);
      });

      it('también se trunca si la última fila no termina en salto de línea', () => {
        const result = parseCsv('A\n1\n2\n3', { maxRows: 2 });
        expect(result.truncated).toBeTrue();
        expect(result.rows.length).toBe(3);
      });
    });

    describe('ida y vuelta con toCsv', () => {
      const textos = ['simple', 'con;punto y coma', 'con "comillas"', 'dos\nlíneas', '=FÓRMULA', 'ñandú, tilde', 'a\r\nb'];
      it('lo que se escribe se lee igual (salvo el apóstrofo de las fórmulas)', () => {
        const csv = toCsv(['COL'], textos.map((t) => [t]));
        const leido = parseCsv(csv).rows.slice(1).map((r) => r[0]);
        expect(leido).toEqual(textos.map((t) => (t.startsWith('=') ? `'${t}` : t)));
      });
    });
  });
});
