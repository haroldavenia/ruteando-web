import { parseCsv } from '../../../shared/data/csv';
import { packagesToCsv } from '../package-export';
import { Package } from '../../../core/api/models';

import {
  IMPORT_COLUMNS,
  MAX_TEXT_LENGTH,
  ValidationResult,
  importErrorsCsv,
  normalizeHeader,
  packageTemplateCsv,
  validateRows,
} from './package-rows';

import list from '../../../../testing/fixtures/gateway/get__packages.json';

const validate = (csv: string): ValidationResult => validateRows(parseCsv(csv));
const HEADER = 'DIRECCION;LONGITUD;LATITUD';
const errorsOf = (result: ValidationResult) => result.errors.map((e) => `${e.line}:${e.field}:${e.message}`);

describe('package-rows', () => {
  describe('fila mínima y valores por defecto', () => {
    it('con solo dirección y coordenadas rellena los valores por defecto', () => {
      const result = validate(`${HEADER}\nCalle 1;-74.07728;4.60872`);
      expect(result.errors).toEqual([]);
      expect(result.valid.length).toBe(1);
      expect(result.valid[0].input).toEqual({
        name: 'Calle 1',
        serviceType: 'delivery',
        address: 'Calle 1',
        location: { type: 'Point', coordinates: [-74.07728, 4.60872] },
        weight: 0,
        volume: 0,
      });
    });

    it('el nombre por defecto es la guía si la hay', () => {
      const result = validate(`ID_GUIA;${HEADER}\nG-1;Calle 1;-74;4.6`);
      expect(result.valid[0].input.name).toBe('G-1');
      expect(result.valid[0].input.guideNumber).toBe('G-1');
    });

    it('lee todas las columnas opcionales', () => {
      const result = validate(
        'ID_GUIA;NOMBRE;SERVICIO;DIRECCION;CIUDAD;PAIS;CODIGO_POSTAL;LONGITUD;LATITUD;PESO;VOLUMEN;PIEZAS;OBSERVACION\n' +
          'G-9;Ana;Recogida;Calle 9;Bogotá;Colombia;110231;-74,1;4,7;2.5;0,3;3;Llamar',
      );
      expect(result.errors).toEqual([]);
      expect(result.valid[0].input).toEqual({
        name: 'Ana',
        serviceType: 'pickup',
        address: 'Calle 9',
        location: { type: 'Point', coordinates: [-74.1, 4.7] },
        weight: 2.5,
        volume: 0.3,
        guideNumber: 'G-9',
        city: 'Bogotá',
        country: 'Colombia',
        postalCode: '110231',
        observation: 'Llamar',
        pieceNumber: 3,
      });
    });
  });

  describe('cabecera', () => {
    it('reconoce alias en español e inglés, sin tildes ni mayúsculas', () => {
      const result = validate('Dirección;Lon;Lat;Tipo de servicio;Número de piezas\nCalle 1;-74;4.6;MIXTO;2');
      expect(result.errors).toEqual([]);
      expect(result.valid[0].input.serviceType).toBe('mixed');
      expect(result.valid[0].input.pieceNumber).toBe(2);
    });

    it('indica las columnas obligatorias que faltan y no valida ninguna fila', () => {
      const result = validate('NOMBRE;DIRECCION\nAna;Calle 1');
      expect(result.missingColumns).toEqual(['LONGITUD', 'LATITUD']);
      expect(result.valid).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('lista las columnas desconocidas y las ignora', () => {
      const result = validate(`${HEADER};COLOR;ESTADO\nCalle 1;-74;4.6;rojo;ok`);
      expect(result.ignoredColumns).toEqual(['COLOR', 'ESTADO']);
      expect(result.valid.length).toBe(1);
    });

    it('si una columna se repite vale la primera', () => {
      const result = validate('DIRECCION;LONGITUD;LATITUD;DIRECCION\nPrimera;-74;4.6;Segunda');
      expect(result.valid[0].input.address).toBe('Primera');
    });

    it('normalizeHeader quita tildes, signos y mayúsculas', () => {
      expect(normalizeHeader('ID_GUÍA')).toBe('idguia');
      expect(normalizeHeader(' Código postal ')).toBe('codigopostal');
    });

    it('reconoce el CSV que exporta la propia aplicación', () => {
      const exported = packagesToCsv([list.response.body.content[0] as unknown as Package]);
      const result = validate(exported);
      expect(result.missingColumns).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.valid.length).toBe(1);
      expect(result.valid[0].input.address).toBe('Fixture address');
      expect(result.valid[0].input.location.coordinates).toEqual([-74.07728, 4.60872]);
      // Columnas del export que no son de importación
      expect(result.ignoredColumns).toEqual(jasmine.arrayContaining(['ESTADO DE GEOCODIFICACION', 'ESTADO']));
    });
  });

  describe('errores por fila', () => {
    it('cada error nombra la línea y el campo', () => {
      const result = validate(`${HEADER}\n;-74;4.6\nCalle 2;;4.6\nCalle 3;-74;`);
      expect(errorsOf(result)).toEqual([
        '2:DIRECCION:La dirección es obligatoria',
        jasmine.stringMatching(/^3:LONGITUD:La longitud es obligatoria/) as unknown as string,
        jasmine.stringMatching(/^4:LATITUD:La latitud es obligatoria/) as unknown as string,
      ]);
      expect(result.valid).toEqual([]);
    });

    it('las coordenadas fuera de rango o no numéricas se rechazan', () => {
      const result = validate(`${HEADER}\nA;181;4\nB;-181;4\nC;-74;91\nD;-74;-91\nE;abc;4\nF;-74;4N`);
      expect(result.errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6, 7]);
      expect(result.errors.filter((e) => e.field === 'LONGITUD').length).toBe(3);
      expect(result.errors.filter((e) => e.field === 'LATITUD').length).toBe(3);
    });

    it('los extremos de rango son válidos', () => {
      const result = validate(`${HEADER}\nA;180;90\nB;-180;-90\nC;0;0`);
      expect(result.errors).toEqual([]);
      expect(result.valid.length).toBe(3);
    });

    it('acepta coma decimal entrecomillada y rechaza separadores de miles', () => {
      const result = validate(`${HEADER}\nA;"-74,07728";"4,60872"\nB;-74.0;1.234,56`);
      expect(result.valid.length).toBe(1);
      expect(result.valid[0].input.location.coordinates).toEqual([-74.07728, 4.60872]);
      expect(result.errors.map((e) => e.line)).toEqual([3]);
    });

    it('peso y volumen negativos o no numéricos se rechazan', () => {
      const result = validate(`${HEADER};PESO;VOLUMEN\nA;-74;4;-1;0\nB;-74;4;0;x`);
      expect(errorsOf(result).map((e) => e.split(':')[1])).toEqual(['PESO', 'VOLUMEN']);
    });

    for (const bad of ['0', '-1', '1.5', 'dos']) {
      it(`las piezas «${bad}» se rechazan`, () => {
        const result = validate(`${HEADER};PIEZAS\nA;-74;4;${bad}`);
        expect(result.errors.map((e) => e.field)).toEqual(['PIEZAS']);
      });
    }

    it('el tipo de servicio acepta entrega, recogida y mixto (o sus claves) y rechaza lo demás', () => {
      const types = ['entrega', 'Recogida', 'MIXTO', 'delivery', 'pickup', 'mixed', 'Envío'];
      const result = validate(`${HEADER};SERVICIO\n${types.map((t) => `A;-74;4;${t}`).join('\n')}`);
      expect(result.valid.map((r) => r.input.serviceType)).toEqual(['delivery', 'pickup', 'mixed', 'delivery', 'pickup', 'mixed']);
      expect(result.errors.map((e) => e.line)).toEqual([8]);
    });

    it('una guía repetida en el archivo rechaza la segunda e indica la línea de la primera', () => {
      const result = validate(`ID_GUIA;${HEADER}\nG-1;A;-74;4\nG-2;B;-74;4\nG-1;C;-74;4`);
      expect(result.valid.map((r) => r.input.guideNumber)).toEqual(['G-1', 'G-2']);
      expect(result.errors).toEqual([{ line: 4, field: 'ID_GUIA', message: 'La guía «G-1» ya aparece en la línea 2' }]);
    });

    it('un texto de más de 500 caracteres rechaza la fila', () => {
      const result = validate(`${HEADER};OBSERVACION\nA;-74;4;${'x'.repeat(MAX_TEXT_LENGTH + 1)}\nB;-74;4;${'x'.repeat(MAX_TEXT_LENGTH)}`);
      expect(result.errors.map((e) => `${e.line}:${e.field}`)).toEqual(['2:OBSERVACION']);
      expect(result.valid.length).toBe(1);
    });

    it('una fila con varios errores los informa todos', () => {
      const result = validate(`${HEADER};PESO\n;abc;100;-2`);
      expect(result.errors.length).toBe(4);
      expect(new Set(result.errors.map((e) => e.line))).toEqual(new Set([2]));
    });

    it('los errores salen ordenados por línea y las líneas cuentan registros con saltos de línea', () => {
      const result = validate(`${HEADER};OBSERVACION\nA;-74;4;"uno\ndos"\n;-74;4;x`);
      expect(result.errors.map((e) => e.line)).toEqual([4]);
    });

    it('el total cuenta las filas de datos, válidas o no', () => {
      const result = validate(`${HEADER}\nA;-74;4\n;;\nB;-74;4`);
      expect(result.totalRows).toBe(3);
      expect(result.valid.length).toBe(2);
    });
  });

  describe('contenido no fiable', () => {
    it('conserva como texto las fórmulas y las etiquetas, sin interpretarlas', () => {
      const result = validate(`${HEADER};NOMBRE\n=HYPERLINK("http://x");-74;4;<script>alert(1)</script>`);
      expect(result.valid[0].input.address).toBe('=HYPERLINK("http://x")');
      expect(result.valid[0].input.name).toBe('<script>alert(1)</script>');
    });

    it('recorta espacios alrededor de las celdas', () => {
      const result = validate(`${HEADER}\n  Calle 1  ; -74 ; 4.6 `);
      expect(result.valid[0].input.address).toBe('Calle 1');
      expect(result.valid[0].input.location.coordinates).toEqual([-74, 4.6]);
    });
  });

  describe('plantilla e informe', () => {
    it('la plantilla se lee de vuelta sin errores y con una fila válida', () => {
      const csv = packageTemplateCsv();
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      const result = validate(csv);
      expect(result.missingColumns).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.ignoredColumns).toEqual([]);
      expect(result.valid.length).toBe(1);
      expect(parseCsv(csv).rows[0]).toEqual(IMPORT_COLUMNS.map((c) => c.header));
    });

    it('el informe empieza por BOM, usa ; y protege las fórmulas', () => {
      const csv = importErrorsCsv([{ line: 7, field: 'DIRECCION', message: 'La dirección es obligatoria', original: ['=1+1', '-74', '4'] }]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      const rows = parseCsv(csv).rows;
      expect(rows[0]).toEqual(['LINEA', 'CAMPO', 'MOTIVO', 'FILA ORIGINAL']);
      expect(rows[1].slice(0, 3)).toEqual(['7', 'DIRECCION', 'La dirección es obligatoria']);
      expect(rows[1][3]).toBe("'=1+1 | -74 | 4");
    });
  });
});
