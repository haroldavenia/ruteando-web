import { PLATFORM_ID, ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PackagesApi } from '../../../core/api/data/packages.api';
import { downloadCsv, parseCsv } from '../../../shared/data/csv';
import { HasUnsavedChanges } from '../../../shared/data/unsaved-changes.guard';
import { formatLatLng } from '../../../shared/format';
import { FormHeadComponent } from '../../../shared/form/form-head.component';

import { RowResult, runImport } from './package-importer';
import {
  ERRORS_FILE_NAME,
  IMPORT_COLUMNS,
  ImportRow,
  PREVIEW_ROWS,
  ReportEntry,
  RowError,
  TEMPLATE_FILE_NAME,
  ValidationResult,
  importErrorsCsv,
  packageTemplateCsv,
  validateRows,
} from './package-rows';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_DATA_ROWS = 2000;
const MAX_ERRORS_SHOWN = 200;

type Phase = 'empty' | 'reading' | 'preview' | 'importing' | 'done';

@Component({
  selector: 'app-package-import',
  imports: [RouterLink, FormHeadComponent, MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './package-import.component.html',
  styleUrl: './package-import.component.scss',
})
export class PackageImportComponent implements HasUnsavedChanges {
  private readonly api = inject(PackagesApi);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly columns = IMPORT_COLUMNS;
  protected readonly previewLimit = PREVIEW_ROWS;
  protected readonly maxRows = MAX_DATA_ROWS;
  protected readonly phase = signal<Phase>('empty');
  protected readonly fileName = signal('');
  protected readonly problem = signal<string | null>(null);
  protected readonly warnings = signal<string[]>([]);
  protected readonly validation = signal<ValidationResult | null>(null);
  protected readonly results = signal<RowResult[]>([]);
  protected readonly progress = signal({ done: 0, total: 0 });
  protected readonly cancelling = signal(false);
  private cancelled = false;
  private destroyed = false;

  /** Los cuatro pasos de la importación y en cuál va: la fase decide qué pasos están hechos, cuál es el actual y cuáles faltan. */
  protected readonly steps = computed(() => {
    const current = { empty: 2, reading: 2, preview: 3, importing: 4, done: 4 }[this.phase()];
    const labels = ['Prepara el archivo', 'Elige el archivo', 'Revisa y confirma', 'Importa'];
    return labels.map((label, index) => {
      const number = index + 1;
      const finished = this.phase() === 'done' && number === 4;
      return { number, label, state: number < current || finished ? ('done' as const) : number === current ? ('current' as const) : ('todo' as const) };
    });
  });

  protected readonly shownErrors = computed<RowError[]>(() => (this.validation()?.errors ?? []).slice(0, MAX_ERRORS_SHOWN));
  protected readonly hiddenErrors = computed(() => Math.max(0, (this.validation()?.errors.length ?? 0) - MAX_ERRORS_SHOWN));
  protected readonly preview = computed<ImportRow[]>(() => (this.validation()?.valid ?? []).slice(0, PREVIEW_ROWS));
  protected readonly validCount = computed(() => this.validation()?.valid.length ?? 0);
  protected readonly invalidRows = computed(() => new Set((this.validation()?.errors ?? []).map((e) => e.line)).size);

  protected readonly counts = computed(() => {
    const all = this.results();
    const count = (status: RowResult['status']) => all.filter((r) => r.status === status).length;
    return { created: count('created'), existed: count('existed'), failed: count('failed'), skipped: count('skipped') };
  });
  protected readonly failedRows = computed(() => this.results().filter((r) => r.status === 'failed'));
  protected readonly summaryText = computed(() => {
    const c = this.counts();
    return `Importación terminada: ${c.created} creados, ${c.existed} ya existían, ${c.failed} fallidos y ${c.skipped} sin procesar.`;
  });
  protected readonly reportEntries = computed<ReportEntry[]>(() => [
    ...(this.validation()?.errors ?? []).map((e) => ({ ...e, original: this.originalOf(e.line) })),
    ...this.results()
      .filter((r) => r.status === 'failed' || r.status === 'skipped')
      .map((r) => ({ line: r.row.line, field: '—', message: r.message ?? '', original: r.row.original })),
  ]);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.cancelled = true;
    });
  }

  hasUnsavedChanges(): boolean {
    return this.phase() === 'importing';
  }

  leaveDialog(): { title: string; message: string; confirmLabel: string; cancelLabel: string } {
    return {
      title: '¿Salir de la importación?',
      message: 'Hay una importación en curso. Si sales ahora se detendrá: los paquetes ya creados se conservan y el resto no se creará.',
      confirmLabel: 'Salir',
      cancelLabel: 'Seguir importando',
    };
  }

  protected downloadTemplate(): void {
    downloadCsv(TEMPLATE_FILE_NAME, packageTemplateCsv(), this.platformId);
  }

  protected downloadReport(): void {
    downloadCsv(ERRORS_FILE_NAME, importErrorsCsv(this.reportEntries()), this.platformId);
  }

  protected location(row: ImportRow): string {
    const [lng, lat] = row.input.location.coordinates;
    return formatLatLng({ lat, lng });
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.reset();
    if (!file) {
      return;
    }
    this.fileName.set(file.name);
    if (!/\.csv$/i.test(file.name)) {
      return this.reject('El archivo debe ser un CSV (extensión .csv).');
    }
    if (file.size === 0) {
      return this.reject('El archivo está vacío.');
    }
    if (file.size > MAX_FILE_BYTES) {
      return this.reject('El archivo supera los 2 MB. Divídelo en varios archivos más pequeños.');
    }
    this.phase.set('reading');
    let text: string;
    try {
      text = await file.text();
    } catch {
      return this.reject('No se pudo leer el archivo.');
    }
    if (this.destroyed) {
      return;
    }
    const table = parseCsv(text, { maxRows: MAX_DATA_ROWS });
    if (table.truncated) {
      return this.reject(`El archivo tiene más de ${MAX_DATA_ROWS} filas de datos. Divídelo en varios archivos.`);
    }
    if (table.rows.length < 2) {
      return this.reject('El archivo no tiene filas de datos: solo la cabecera o nada.');
    }
    const result = validateRows(table);
    table.rows.slice(1).forEach((record, i) => this.rawRows.set(table.lines[i + 1], record));
    if (result.missingColumns.length > 0) {
      return this.reject(`Faltan columnas obligatorias: ${result.missingColumns.join(', ')}. Descarga la plantilla para ver el formato.`);
    }
    const warnings: string[] = [];
    if (text.includes('�')) {
      warnings.push('Hay caracteres ilegibles (�): el archivo probablemente no está en UTF-8. Vuelve a guardarlo con esa codificación para conservar las tildes.');
    }
    if (table.unterminatedQuote) {
      warnings.push('Hay una comilla sin cerrar: las últimas filas pueden haberse leído mal. Revisa el archivo.');
    }
    if (result.ignoredColumns.length > 0) {
      warnings.push(`Se ignoran las columnas: ${result.ignoredColumns.join(', ')}.`);
    }
    this.warnings.set(warnings);
    this.validation.set(result);
    this.phase.set('preview');
  }

  protected clearFile(input: HTMLInputElement): void {
    input.value = '';
    this.reset();
  }

  protected async start(): Promise<void> {
    const rows = this.validation()?.valid ?? [];
    this.results.set([]);
    await this.run(rows);
  }

  protected async retryFailed(): Promise<void> {
    const failed = this.failedRows().map((r) => r.row);
    const kept = this.results().filter((r) => r.status !== 'failed');
    this.results.set(kept);
    await this.run(failed);
  }

  protected cancel(): void {
    this.cancelled = true;
    this.cancelling.set(true);
  }

  private async run(rows: readonly ImportRow[]): Promise<void> {
    this.cancelled = false;
    this.cancelling.set(false);
    this.phase.set('importing');
    const previous = this.results();
    this.progress.set({ done: 0, total: rows.length });
    const outcome = await runImport(rows, (input) => firstValueFrom(this.api.create(input)), {
      isCancelled: () => this.cancelled,
      onProgress: (p) => this.progress.set(p),
    });
    if (this.destroyed) {
      return;
    }
    this.results.set([...previous, ...outcome].sort((a, b) => a.row.line - b.row.line));
    this.cancelling.set(false);
    this.phase.set('done');
  }

  private originalOf(line: number): string[] {
    return this.rawRows.get(line) ?? [];
  }

  private readonly rawRows = new Map<number, string[]>();

  private reject(message: string): void {
    this.problem.set(message);
    this.phase.set('empty');
  }

  private reset(): void {
    this.phase.set('empty');
    this.problem.set(null);
    this.warnings.set([]);
    this.validation.set(null);
    this.results.set([]);
    this.fileName.set('');
    this.rawRows.clear();
  }
}
