import { PackageInput } from '../../../core/api/models';
import { toGeoJsonPoint } from '../../../core/geo/lat-lng';
import { toCsv } from '../../../shared/data/csv';

export const MAX_TEXT_LENGTH = 500;
export const PREVIEW_ROWS = 20;

export type ColumnKey =
  | 'guideNumber'
  | 'name'
  | 'serviceType'
  | 'address'
  | 'city'
  | 'country'
  | 'postalCode'
  | 'longitude'
  | 'latitude'
  | 'weight'
  | 'volume'
  | 'pieceNumber'
  | 'observation';

export interface ImportColumn {
  key: ColumnKey;
  /** Nombre de la columna en la plantilla. */
  header: string;
  /** Otros nombres admitidos, ya normalizados (minúsculas, sin tildes ni signos). */
  aliases: string[];
  required: boolean;
  description: string;
  /** Valor por defecto cuando falta, en lenguaje llano. */
  fallback: string;
  example: string;
}

/** Columnas del archivo. La cabecera exportada por la propia aplicación (`ID_GUIA`, `LONGITUD`...) se reconoce. */
export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  { key: 'guideNumber', header: 'ID_GUIA', aliases: ['idguia', 'guia', 'numeroguia', 'numerodeguia', 'guidenumber', 'guide'], required: false, description: 'Número de guía; debe ser único en tu empresa', fallback: 'sin guía', example: 'G-1001' },
  { key: 'name', header: 'NOMBRE', aliases: ['nombre', 'name'], required: false, description: 'Nombre o referencia del paquete', fallback: 'la guía o, si no hay, la dirección', example: 'Paquete de Ana' },
  { key: 'serviceType', header: 'SERVICIO', aliases: ['servicio', 'tiposervicio', 'tipodeservicio', 'servicetype'], required: false, description: 'Entrega, Recogida o Mixto', fallback: 'Entrega', example: 'Entrega' },
  { key: 'address', header: 'DIRECCION', aliases: ['direccion', 'address'], required: true, description: 'Dirección del servicio', fallback: '—', example: 'Carrera 7 # 71-21' },
  { key: 'city', header: 'CIUDAD', aliases: ['ciudad', 'city'], required: false, description: 'Ciudad', fallback: 'vacío', example: 'Bogotá' },
  { key: 'country', header: 'PAIS', aliases: ['pais', 'country'], required: false, description: 'País', fallback: 'vacío', example: 'Colombia' },
  { key: 'postalCode', header: 'CODIGO_POSTAL', aliases: ['codigopostal', 'cp', 'postalcode', 'zipcode'], required: false, description: 'Código postal', fallback: 'vacío', example: '110231' },
  { key: 'longitude', header: 'LONGITUD', aliases: ['longitud', 'lon', 'lng', 'longitude'], required: true, description: 'Longitud entre -180 y 180 (punto o coma decimal)', fallback: '—', example: '-74.07728' },
  { key: 'latitude', header: 'LATITUD', aliases: ['latitud', 'lat', 'latitude'], required: true, description: 'Latitud entre -90 y 90 (punto o coma decimal)', fallback: '—', example: '4.60872' },
  { key: 'weight', header: 'PESO', aliases: ['peso', 'weight'], required: false, description: 'Peso, número mayor o igual que 0', fallback: '0', example: '2.5' },
  { key: 'volume', header: 'VOLUMEN', aliases: ['volumen', 'volume'], required: false, description: 'Volumen, número mayor o igual que 0', fallback: '0', example: '0.3' },
  { key: 'pieceNumber', header: 'PIEZAS', aliases: ['piezas', 'numeropiezas', 'numerodepiezas', 'piecenumber', 'pieces'], required: false, description: 'Número de piezas, entero de 1 o más', fallback: '1', example: '1' },
  { key: 'observation', header: 'OBSERVACION', aliases: ['observacion', 'observaciones', 'observation', 'notas'], required: false, description: 'Observaciones', fallback: 'vacío', example: 'Llamar al llegar' },
];

export interface RowError {
  /** Línea del archivo en la que empieza el registro. */
  line: number;
  /** Cabecera de la columna con el problema (o `—` si afecta a toda la fila). */
  field: string;
  message: string;
}

export interface ImportRow {
  line: number;
  input: PackageInput;
  /** Valores originales del registro, para el informe. */
  original: string[];
}

export interface ValidationResult {
  header: string[];
  totalRows: number;
  valid: ImportRow[];
  errors: RowError[];
  /** Columnas del archivo que no se reconocen y se ignoran. */
  ignoredColumns: string[];
  /** Cabeceras obligatorias que faltan; si hay alguna no se valida ninguna fila. */
  missingColumns: string[];
}

const SERVICE_TYPES: Readonly<Record<string, string>> = {
  entrega: 'delivery',
  delivery: 'delivery',
  recogida: 'pickup',
  pickup: 'pickup',
  mixto: 'mixed',
  mixed: 'mixed',
};

/** Minúsculas, sin tildes y sin espacios, guiones ni signos: `ID_GUIA` → `idguia`. */
export function normalizeHeader(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Número con punto o coma decimal; rechaza separadores de miles (`1.234,56`) por ambiguos. */
function parseNumber(text: string): number | null {
  if (!/^-?\d+([.,]\d+)?$/.test(text)) {
    return null;
  }
  return Number(text.replace(',', '.'));
}

export function validateRows(table: { rows: string[][]; lines: number[] }): ValidationResult {
  const [headerRow = [], ...dataRows] = table.rows;
  const header = headerRow.map((cell) => cell.trim());
  const columnIndex = new Map<ColumnKey, number>();
  const ignoredColumns: string[] = [];
  header.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    const column = IMPORT_COLUMNS.find((c) => normalizeHeader(c.header) === normalized || c.aliases.includes(normalized));
    if (column && !columnIndex.has(column.key)) {
      columnIndex.set(column.key, index);
    } else if (cell !== '') {
      ignoredColumns.push(cell);
    }
  });

  const missingColumns = IMPORT_COLUMNS.filter((c) => c.required && !columnIndex.has(c.key)).map((c) => c.header);
  const result: ValidationResult = { header, totalRows: dataRows.length, valid: [], errors: [], ignoredColumns, missingColumns };
  if (missingColumns.length > 0) {
    return result;
  }

  const headerOf = (key: ColumnKey) => IMPORT_COLUMNS.find((c) => c.key === key)!.header;
  const guideLines = new Map<string, number>();

  dataRows.forEach((record, i) => {
    const line = table.lines[i + 1];
    const cell = (key: ColumnKey): string => (record[columnIndex.get(key) ?? -1] ?? '').trim();
    const errors: RowError[] = [];
    const fail = (key: ColumnKey, message: string) => errors.push({ line, field: headerOf(key), message });

    for (const column of IMPORT_COLUMNS) {
      if (cell(column.key).length > MAX_TEXT_LENGTH) {
        fail(column.key, `Supera los ${MAX_TEXT_LENGTH} caracteres`);
      }
    }

    const address = cell('address');
    if (!address) {
      fail('address', 'La dirección es obligatoria');
    }

    const longitude = cell('longitude');
    const latitude = cell('latitude');
    const lon = longitude === '' ? null : parseNumber(longitude);
    const lat = latitude === '' ? null : parseNumber(latitude);
    if (longitude === '') {
      fail('longitude', 'La longitud es obligatoria (la aplicación no calcula ubicaciones a partir de direcciones)');
    } else if (lon === null || Math.abs(lon) > 180) {
      fail('longitude', 'La longitud debe ser un número entre -180 y 180');
    }
    if (latitude === '') {
      fail('latitude', 'La latitud es obligatoria (la aplicación no calcula ubicaciones a partir de direcciones)');
    } else if (lat === null || Math.abs(lat) > 90) {
      fail('latitude', 'La latitud debe ser un número entre -90 y 90');
    }

    const service = cell('serviceType');
    const serviceType = service === '' ? 'delivery' : SERVICE_TYPES[normalizeHeader(service)];
    if (!serviceType) {
      fail('serviceType', 'El tipo de servicio debe ser Entrega, Recogida o Mixto');
    }

    const number = (key: ColumnKey, label: string): number => {
      const text = cell(key);
      if (text === '') {
        return 0;
      }
      const value = parseNumber(text);
      if (value === null || value < 0) {
        fail(key, `${label} debe ser un número mayor o igual que 0`);
        return 0;
      }
      return value;
    };
    const weight = number('weight', 'El peso');
    const volume = number('volume', 'El volumen');

    const piecesText = cell('pieceNumber');
    let pieces: number | null = null;
    if (piecesText !== '') {
      if (/^\d+$/.test(piecesText) && Number(piecesText) >= 1) {
        pieces = Number(piecesText);
      } else {
        fail('pieceNumber', 'Las piezas deben ser un número entero de 1 o más');
      }
    }

    const guide = cell('guideNumber');
    if (guide) {
      const first = guideLines.get(guide);
      if (first !== undefined) {
        fail('guideNumber', `La guía «${guide}» ya aparece en la línea ${first}`);
      } else {
        guideLines.set(guide, line);
      }
    }

    if (errors.length > 0 || !serviceType || lon === null || lat === null) {
      result.errors.push(...errors);
      return;
    }
    const location = toGeoJsonPoint({ lat, lng: lon });
    if (!location) {
      result.errors.push({ line, field: headerOf('latitude'), message: 'La ubicación no es válida' });
      return;
    }
    const optional = {
      ...(guide ? { guideNumber: guide } : {}),
      ...(cell('city') ? { city: cell('city') } : {}),
      ...(cell('country') ? { country: cell('country') } : {}),
      ...(cell('postalCode') ? { postalCode: cell('postalCode') } : {}),
      ...(cell('observation') ? { observation: cell('observation') } : {}),
      ...(pieces !== null ? { pieceNumber: pieces } : {}),
    };
    result.valid.push({
      line,
      original: record,
      input: { name: cell('name') || guide || address, serviceType, address, location, weight, volume, ...optional },
    });
  });

  result.errors.sort((a, b) => a.line - b.line);
  return result;
}

const NUMERIC = new Set<ColumnKey>(['longitude', 'latitude', 'weight', 'volume', 'pieceNumber']);

/** Plantilla descargable: cabecera, una fila de ejemplo y las mismas columnas que acepta la importación. */
export function packageTemplateCsv(): string {
  return toCsv(
    IMPORT_COLUMNS.map((c) => c.header),
    // Los ejemplos numéricos van como números: un texto que empieza por «-» se protegería como fórmula
    [IMPORT_COLUMNS.map((c) => (NUMERIC.has(c.key) ? Number(c.example) : c.example))],
  );
}

export const TEMPLATE_FILE_NAME = 'plantilla-paquetes.csv';
export const ERRORS_FILE_NAME = 'errores-importacion.csv';

export interface ReportEntry {
  line: number;
  field: string;
  message: string;
  original?: readonly string[];
}

/** Informe de errores: línea, campo, motivo y la fila original, con las celdas protegidas contra fórmulas. */
export function importErrorsCsv(entries: readonly ReportEntry[]): string {
  return toCsv(
    ['LINEA', 'CAMPO', 'MOTIVO', 'FILA ORIGINAL'],
    entries.map((entry) => [entry.line, entry.field, entry.message, (entry.original ?? []).join(' | ')]),
  );
}
