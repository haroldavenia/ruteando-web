import { isPlatformBrowser } from '@angular/common';

const BOM = '﻿';
const SEPARATOR = ';';
const EOL = '\r\n';

/**
 * Texto de una celda: los que empiezan por `=`, `+`, `-`, `@`, tabulación o retorno llevan un apóstrofo
 * delante para que la hoja de cálculo no los interprete como fórmula, y los que tienen `;`, comillas o
 * saltos de línea van entrecomillados. Los números (con su signo) no se tocan.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV con cabecera, separador `;`, fin de línea `\r\n` y BOM al inicio (Excel lo abre en UTF-8). */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return BOM + [header, ...rows].map((row) => row.map(csvCell).join(SEPARATOR)).join(EOL) + EOL;
}

/** Descarga el texto como fichero; no hace nada fuera del navegador. Devuelve si se inició la descarga. */
export function downloadCsv(fileName: string, csv: string, platformId: object | string): boolean {
  if (!isPlatformBrowser(platformId)) {
    return false;
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
  return true;
}

export interface ParsedCsv {
  /** Registros (la cabecera es el primero), con las celdas tal cual vienen. */
  rows: string[][];
  /** Número de línea del archivo en la que empieza cada registro (empieza en 1). */
  lines: number[];
  delimiter: string;
  /** `true` si se dejó de leer al superar `maxRows` filas de datos. */
  truncated: boolean;
  /** `true` si una comilla quedó sin cerrar y se tomó el resto del archivo como parte de la celda. */
  unterminatedQuote: boolean;
}

const DELIMITERS = [';', ',', '\t'] as const;

/** Separador más frecuente en la primera línea fuera de comillas; empata a favor de `;`. */
function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && (char === '\n' || char === '\r')) {
      break;
    } else if (!inQuotes && char in counts) {
      counts[char]++;
    }
  }
  return DELIMITERS.reduce((best, d) => (counts[d] > counts[best] ? d : best), ';');
}

/**
 * Lee un CSV: BOM, `\r\n`, `\n` y `\r`, comillas dobles con `""` escapado, separadores y saltos de línea
 * dentro de comillas y líneas vacías (se ignoran). Detecta el separador por la cabecera. No interpreta
 * nada: todas las celdas son texto. Se detiene tras `maxRows` filas de datos.
 */
export function parseCsv(input: string, options: { maxRows?: number } = {}): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  const lines: number[] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let quoted = false;
  let line = 1;
  let startLine = 1;
  let truncated = false;
  let unterminatedQuote = false;

  const endRecord = (): boolean => {
    row.push(field);
    const blank = row.length === 1 && row[0].trim() === '' && !quoted;
    if (!blank) {
      rows.push(row);
      lines.push(startLine);
    }
    row = [];
    field = '';
    quoted = false;
    return options.maxRows !== undefined && rows.length > options.maxRows + 1;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') {
          line++;
        }
        field += char;
      }
      continue;
    }
    if (char === '"' && field === '') {
      inQuotes = true;
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      line++;
      if (endRecord()) {
        truncated = true;
        rows.pop();
        lines.pop();
        break;
      }
      startLine = line;
    } else {
      field += char;
    }
  }
  if (inQuotes) {
    unterminatedQuote = true;
  }
  if (!truncated && (field !== '' || row.length > 0 || quoted)) {
    endRecord();
    if (options.maxRows !== undefined && rows.length > options.maxRows + 1) {
      truncated = true;
      rows.pop();
      lines.pop();
    }
  }
  return { rows, lines, delimiter, truncated, unterminatedQuote };
}
