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
