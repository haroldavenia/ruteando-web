/** Una celda de un reporte: texto, número o vacío. */
export type ReportCell = string | number | null;

/** Una hoja (o la tabla de un PDF): cabecera y filas ya en texto de pantalla. */
export interface ReportTable {
  name: string;
  header: readonly string[];
  rows: readonly (readonly ReportCell[])[];
}

/** Lo que lleva el PDF de un reporte: título, datos de resumen (etiqueta y valor) y la tabla. */
export interface PdfReport {
  title: string;
  summary: readonly (readonly [string, string])[];
  table: ReportTable;
}

const MAX_SHEET_NAME = 31;

/** Nombre de hoja válido en Excel: sin `\ / ? * [ ] :`, de hasta 31 caracteres y distinto de los ya usados (sin importar mayúsculas). */
export function sheetNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((raw, index) => {
    const base =
      raw
        .replace(/[\\/?*[\]:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || `Hoja ${index + 1}`;
    let name = base.slice(0, MAX_SHEET_NAME);
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      const suffix = ` (${n})`;
      name = base.slice(0, MAX_SHEET_NAME - suffix.length) + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

/** Descarga un archivo desde el navegador. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}

/**
 * Libro de Excel con una hoja por tabla y la cabecera en negrita. La librería se carga al exportar (no entra en el paquete inicial) y se
 * usa su variante `universal`, que no crea Web Workers (la CSP solo admite `worker-src 'self'`). Los textos van como texto, nunca como fórmula.
 */
export async function downloadXlsx(fileName: string, tables: readonly ReportTable[]): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const names = sheetNames(tables.map((table) => table.name));
  const sheets = tables.map((table, i) => ({
    sheet: names[i],
    data: [table.header.map((value) => ({ value, fontWeight: 'bold' as const })), ...table.rows.map((row) => [...row])],
    columns: table.header.map(() => ({ width: 18 })),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- las celdas mezclan texto, números y vacíos; la librería las acepta todas
  const blob = await writeExcelFile(sheets as any).toBlob();
  downloadBlob(fileName, blob);
}

/** PDF apaisado con título, resumen y tabla (la tabla pagina sola). Las librerías se cargan al exportar. */
export async function downloadPdf(fileName: string, report: PdfReport): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  doc.setFontSize(16);
  doc.text(report.title, margin, margin + 8);
  doc.setFontSize(10);
  let y = margin + 30;
  for (const [label, value] of report.summary) {
    doc.text(`${label} ${value}`, margin, y);
    y += 14;
  }
  autoTable(doc, {
    head: [[...report.table.header]],
    body: report.table.rows.map((row) => row.map((cell) => (cell === null ? '' : String(cell)))),
    startY: y + 6,
    margin,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [66, 133, 244], halign: 'center' },
  });
  doc.save(fileName);
}
