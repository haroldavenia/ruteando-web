'use client';

import { RiCheckLine, RiDownloadLine, RiMapPinLine } from '@remixicon/react';
import Link from 'next/link';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import { FormHead } from '@/components/page/form-kit';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { Package, PackageInput } from '@/lib/api/models';
import { downloadCsv, parseCsv } from '@/lib/csv';
import { geocode } from '@/lib/geocoding';
import { useCrud } from '@/lib/hooks/use-crud';
import { useFormat } from '@/lib/hooks/use-format';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import { type RowResult, runImport } from '@/lib/packages/importer';
import { importableRows, locateRows, needsLocating, type ReviewRow, startReview } from '@/lib/packages/locating';
import {
  ERRORS_FILE_NAME,
  importColumns,
  importErrorsCsv,
  type ImportRow,
  type LocatedImportRow,
  packageTemplateCsv,
  PREVIEW_ROWS,
  type ReportEntry,
  TEMPLATE_FILE_NAME,
  validateRows,
  type ValidationResult,
} from '@/lib/packages/rows';

import { LocationReview } from './location-review';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_DATA_ROWS = 2000;
const MAX_ERRORS_SHOWN = 200;

type Phase = 'empty' | 'reading' | 'preview' | 'locating' | 'review' | 'importing' | 'done';

const TABLE = 'w-full border-collapse text-start text-sm';
const TH = 'border-b border-outline-variant px-3 py-1.5 text-start font-bold';
const TD = 'border-b border-outline-variant px-3 py-1.5 align-top';

/** Una tabla pequeña de la pantalla (columnas, errores, vista previa, fallidas): sin desplazamiento horizontal propio. */
function SimpleTable({ caption, head, children }: { caption: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <caption className="py-2 text-start text-sm font-medium">{caption}</caption>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className={TH}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Importar paquetes desde un CSV: se lee el archivo en el navegador (el gateway no tiene contrato para subirlo), se valida fila a fila, se
 * ubican las direcciones que no traen coordenadas (con una pantalla de revisión) y se crean los paquetes de a cuatro.
 */
export function PackageImport() {
  const t = useT();
  const format = useFormat();
  const api = useCrud<Package, PackageInput>('packages');
  const columns = useMemo(() => importColumns(t), [t]);

  const [phase, setPhase] = useState<Phase>('empty');
  const [fileName, setFileName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [cancelling, setCancelling] = useState(false);
  /** Las filas tal como venían en el archivo, por línea, para el informe de errores. */
  const [rawRows, setRawRows] = useState<ReadonlyMap<number, string[]>>(() => new Map());
  const cancelled = useRef(false);
  const locating = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const abort = locating;
    return () => {
      alive.current = false;
      cancelled.current = true;
      abort.current?.abort();
    };
  }, []);
  useUnsavedWarning(phase === 'importing');

  const validRows = useMemo(() => validation?.valid ?? [], [validation]);
  const pendingLocation = validRows.filter((row) => row.input.location === null).length;
  const reviewing = phase === 'locating' || phase === 'review';
  const invalidRows = new Set((validation?.errors ?? []).map((e) => e.line)).size;
  const counts = useMemo(() => {
    const count = (status: RowResult['status']) => results.filter((r) => r.status === status).length;
    return { created: count('created'), existed: count('existed'), failed: count('failed'), skipped: count('skipped') };
  }, [results]);
  const failedRows = results.filter((r) => r.status === 'failed');
  const reportEntries: ReportEntry[] = [
    ...(validation?.errors ?? []).map((e) => ({ ...e, original: rawRows.get(e.line) ?? [] })),
    ...reviewRows.filter(needsLocating).map((r) => ({
      line: r.line,
      field: '—',
      message: t('No se encontró la ubicación de la dirección'),
      original: r.original,
    })),
    ...results
      .filter((r) => r.status === 'failed' || r.status === 'skipped')
      .map((r) => ({ line: r.row.line, field: '—', message: r.message ?? '', original: r.row.original })),
  ];

  /** Los cuatro pasos de la importación y en cuál va. */
  const current = { empty: 2, reading: 2, preview: 3, locating: 3, review: 3, importing: 4, done: 4 }[phase];
  const steps = [t('Prepara el archivo'), t('Elige el archivo'), t('Revisa y confirma'), t('Importa')].map(
    (label, index) => {
      const number = index + 1;
      const finished = phase === 'done' && number === 4;
      return { number, label, state: number < current || finished ? 'done' : number === current ? 'current' : 'todo' };
    }
  );

  function reset() {
    setPhase('empty');
    setProblem(null);
    setWarnings([]);
    setValidation(null);
    setResults([]);
    setFileName('');
    locating.current?.abort();
    setReviewRows([]);
    setRawRows(new Map());
  }
  function reject(message: string) {
    setProblem(message);
    setPhase('empty');
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    reset();
    if (!file) return;
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) return reject(t('El archivo debe ser un CSV (extensión .csv).'));
    if (file.size === 0) return reject(t('El archivo está vacío.'));
    if (file.size > MAX_FILE_BYTES)
      return reject(t('El archivo supera los 2 MB. Divídelo en varios archivos más pequeños.'));
    setPhase('reading');
    let text: string;
    try {
      text = await file.text();
    } catch {
      return reject(t('No se pudo leer el archivo.'));
    }
    if (!alive.current) return;
    const table = parseCsv(text, { maxRows: MAX_DATA_ROWS });
    if (table.truncated) {
      return reject(t('El archivo tiene más de {0} filas de datos. Divídelo en varios archivos.', [MAX_DATA_ROWS]));
    }
    if (table.rows.length < 2) return reject(t('El archivo no tiene filas de datos: solo la cabecera o nada.'));
    const result = validateRows(table, t);
    setRawRows(new Map(table.rows.slice(1).map((record, i) => [table.lines[i + 1]!, record])));
    if (result.missingColumns.length > 0) {
      return reject(
        t('Faltan columnas obligatorias: {0}. Descarga la plantilla para ver el formato.', [
          result.missingColumns.join(', '),
        ])
      );
    }
    const notes: string[] = [];
    if (text.includes('�')) {
      notes.push(
        t(
          'Hay caracteres ilegibles (�): el archivo probablemente no está en UTF-8. Vuelve a guardarlo con esa codificación para conservar las tildes.'
        )
      );
    }
    if (table.unterminatedQuote) {
      notes.push(t('Hay una comilla sin cerrar: las últimas filas pueden haberse leído mal. Revisa el archivo.'));
    }
    if (result.ignoredColumns.length > 0)
      notes.push(t('Se ignoran las columnas: {0}.', [result.ignoredColumns.join(', ')]));
    setWarnings(notes);
    setValidation(result);
    setPhase('preview');
  }

  async function run(rows: readonly LocatedImportRow[], previous: RowResult[]) {
    cancelled.current = false;
    setCancelling(false);
    setPhase('importing');
    setProgress({ done: 0, total: rows.length });
    const outcome = await runImport(rows, (input) => api.create(input), {
      t,
      isCancelled: () => cancelled.current,
      onProgress: (p) => alive.current && setProgress(p),
    });
    if (!alive.current) return;
    setResults([...previous, ...outcome].sort((a, b) => a.row.line - b.row.line));
    setCancelling(false);
    setPhase('done');
  }

  /**
   * Ubica la dirección de las filas que vinieron sin coordenadas y pasa a revisarlas. Al volver a intentarlo solo se piden las que
   * siguen sin ubicación y se conserva lo que ya se corrigió.
   */
  function locate() {
    const rows = reviewRows.length > 0 ? reviewRows : startReview(validRows);
    setReviewRows(rows);
    setProgress({ done: 0, total: rows.filter(needsLocating).length });
    setCancelling(false);
    setPhase('locating');
    locating.current?.abort();
    const controller = new AbortController();
    locating.current = controller;
    void locateRows(
      rows,
      (query) => geocode(query, t),
      (located) => {
        setReviewRows((all) => all.map((r) => (r.line === located.line ? located : r)));
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      },
      controller.signal
    ).then(() => {
      if (!controller.signal.aborted && alive.current) setPhase('review');
    });
  }

  const location = (row: ImportRow) => {
    if (!row.input.location) return t('Se ubicará a partir de la dirección');
    const [lng, lat] = row.input.location.coordinates;
    return format.latLng({ lat, lng });
  };

  const stepsEl = (
    <ol
      aria-label={t('Pasos de la importación')}
      className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-sm font-medium text-on-surface-variant"
    >
      {steps.map((step) => (
        <li
          key={step.number}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={`inline-flex items-center gap-2 ${step.state === 'current' ? 'font-bold text-on-surface' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`grid size-7 place-items-center rounded-full border text-[13px] ${step.state === 'done' ? 'border-transparent bg-success-container text-on-success-container' : step.state === 'current' ? 'border-transparent bg-brand-gradient text-on-primary' : 'border-outline'}`}
          >
            {step.state === 'done' ? <Icon icon={RiCheckLine} size={18} /> : step.number}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );

  const bar = (value: number, label: string) => (
    <progress aria-label={label} value={value} max={100} className="h-2 w-full accent-primary" />
  );
  const percent = progress.total ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <FormHead title={t('Importar paquetes')} backLabel={t('Paquetes')} backHref="/packages" />
      {stepsEl}

      <Card aria-labelledby="guide-title" className="flex flex-col gap-3">
        <CardTitle id="guide-title">{t('1. Prepara el archivo')}</CardTitle>
        <p>
          {t('El archivo debe ser un CSV en UTF-8 con una fila por paquete.')}{' '}
          <strong>{t('La longitud y la latitud son opcionales:')}</strong>{' '}
          {t(
            'si las dejas vacías, la aplicación ubica la dirección y te deja revisar el resultado antes de importar. Máximo 2 MB y {0} filas.',
            [MAX_DATA_ROWS]
          )}
        </p>
        <div>
          <Button variant="outlined" onClick={() => downloadCsv(TEMPLATE_FILE_NAME, packageTemplateCsv(t))}>
            <Icon icon={RiDownloadLine} size={20} />
            {t('Descargar plantilla')}
          </Button>
        </div>
        <details className="my-1">
          <summary className="cursor-pointer text-sm font-medium">{t('Cómo crear el archivo, paso a paso')}</summary>
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-6">
            <li>
              <strong>{t('Descarga la plantilla.')}</strong>{' '}
              {t('Ya trae los nombres de las columnas en la primera fila: no los cambies.')}
            </li>
            <li>
              <strong>{t('Ábrela en una hoja de cálculo.')}</strong> {t('Sirve Excel, Google Sheets o LibreOffice.')}
            </li>
            <li>
              <strong>{t('Escribe una fila por paquete.')}</strong>{' '}
              {t(
                'Solo la dirección es obligatoria; si dejas vacías la longitud y la latitud, la aplicación las calcula.'
              )}
            </li>
            <li>
              <strong>{t('Guárdala como CSV.')}</strong>{' '}
              {t(
                'En Excel: Guardar como, CSV UTF-8. En Google Sheets: Archivo, Descargar, Valores separados por comas (.csv).'
              )}
            </li>
            <li>
              <strong>{t('Elígela aquí.')}</strong>{' '}
              {t('Antes de importar verás cuántas filas son válidas, cuáles se rechazan y cuáles hay que ubicar.')}
            </li>
          </ol>
        </details>
        <SimpleTable
          caption={t('Columnas del archivo')}
          head={[t('Columna'), t('Obligatoria'), t('Qué lleva'), t('Si falta')]}
        >
          {columns.map((column) => (
            <tr key={column.key} className="border-b border-outline-variant last:border-b-0">
              <th scope="row" className={`${TD} text-start font-medium whitespace-nowrap`}>
                {column.header}
              </th>
              <td className={TD}>{column.required ? t('Sí') : 'No'}</td>
              <td className={TD}>{column.description}</td>
              <td className={TD}>{column.fallback}</td>
            </tr>
          ))}
        </SimpleTable>
      </Card>

      <Card aria-labelledby="file-title" className="flex flex-col gap-3">
        <CardTitle id="file-title">{t('2. Elige el archivo')}</CardTitle>
        <label htmlFor="csv-file" className="font-medium">
          {t('Archivo CSV')}
        </label>
        <input
          ref={fileInput}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          disabled={phase === 'importing' || phase === 'reading' || phase === 'locating'}
          onChange={(event) => void onFile(event)}
          className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-control file:border file:border-outline file:bg-transparent file:px-4 file:py-2 file:text-primary"
        />
        {fileName ? (
          <p role="status" className="text-sm text-on-surface-variant">
            {t('Archivo elegido: {0}', [fileName])}
          </p>
        ) : null}
        {phase === 'reading' ? bar(0, t('Leyendo el archivo')) : null}
        {problem ? (
          <p role="alert" className="text-error">
            {problem}
          </p>
        ) : null}
        {phase === 'preview' || reviewing || phase === 'importing' || phase === 'done' ? (
          <div>
            <Button
              variant="text"
              disabled={phase === 'importing' || phase === 'locating'}
              onClick={() => {
                if (fileInput.current) fileInput.current.value = '';
                reset();
              }}
            >
              {t('Quitar archivo')}
            </Button>
          </div>
        ) : null}
      </Card>

      {validation ? (
        <Card aria-labelledby="preview-title" className="flex flex-col gap-3">
          <CardTitle id="preview-title">{t('3. Revisa y confirma')}</CardTitle>
          <p role="status" aria-live="polite" className="font-medium">
            {t('{0} filas leídas: {1} válidas y {2} rechazadas.', [
              validation.totalRows,
              validRows.length,
              invalidRows,
            ])}
          </p>
          {warnings.map((warning) => (
            <p key={warning} role="status" className="text-sm text-on-warning-container">
              {warning}
            </p>
          ))}
          {pendingLocation > 0 && phase === 'preview' ? (
            <p role="status" className="text-sm text-on-warning-container">
              {t('{0} filas no traen coordenadas: se ubicarán a partir de su dirección.', [pendingLocation])}
            </p>
          ) : null}

          {validation.errors.length > 0 ? (
            <>
              <SimpleTable
                caption={t('Filas rechazadas (no se importarán)')}
                head={[t('Línea'), t('Campo'), t('Motivo')]}
              >
                {validation.errors.slice(0, MAX_ERRORS_SHOWN).map((error, index) => (
                  <tr key={index} className="border-b border-outline-variant last:border-b-0">
                    <td className={TD}>{error.line}</td>
                    <td className={TD}>{error.field}</td>
                    <td className={TD}>{error.message}</td>
                  </tr>
                ))}
              </SimpleTable>
              {validation.errors.length > MAX_ERRORS_SHOWN ? (
                <p>
                  {t('… y {0} errores más; están todos en el informe de errores.', [
                    validation.errors.length - MAX_ERRORS_SHOWN,
                  ])}
                </p>
              ) : null}
            </>
          ) : null}

          {validRows.length > 0 && !reviewing ? (
            <SimpleTable
              caption={t('Primeras {0} filas válidas', [PREVIEW_ROWS])}
              head={[
                t('Línea'),
                t('Guía'),
                t('Nombre'),
                t('Dirección'),
                t('Latitud / longitud'),
                t('Peso'),
                t('Volumen'),
              ]}
            >
              {validRows.slice(0, PREVIEW_ROWS).map((row) => (
                <tr key={row.line} className="border-b border-outline-variant last:border-b-0">
                  <td className={TD}>{row.line}</td>
                  <td className={TD}>{row.input.guideNumber ?? ''}</td>
                  <td className={TD}>{row.input.name}</td>
                  <td className={TD}>{row.input.address}</td>
                  <td className={TD}>{location(row)}</td>
                  <td className={TD}>{row.input.weight}</td>
                  <td className={TD}>{row.input.volume}</td>
                </tr>
              ))}
            </SimpleTable>
          ) : null}

          {phase === 'preview' ? (
            <>
              {validRows.length === 0 ? (
                <p role="alert" className="text-error">
                  {t('Ninguna fila es válida: corrige el archivo y vuelve a elegirlo.')}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {pendingLocation > 0 ? (
                  <Button variant="primary" onClick={locate}>
                    <Icon icon={RiMapPinLine} size={20} />
                    {t('Ubicar direcciones y revisar')}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={validRows.length === 0}
                    onClick={() => void run(importableRows(startReview(validRows)), [])}
                  >
                    {t('Importar {0} paquetes', [validRows.length])}
                  </Button>
                )}
                {validation.errors.length > 0 ? (
                  <Button
                    variant="outlined"
                    onClick={() => downloadCsv(ERRORS_FILE_NAME, importErrorsCsv(reportEntries, t))}
                  >
                    {t('Descargar informe de errores')}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {phase === 'locating' ? (
        <Card aria-labelledby="locating-title" className="flex flex-col gap-3">
          <CardTitle id="locating-title">{t('Ubicando direcciones')}</CardTitle>
          {bar(percent, t('Progreso de la ubicación'))}
          <p role="status" aria-live="polite">
            {t('Ubicando… {0} de {1}', [progress.done, progress.total])}
          </p>
          <div>
            <Button
              variant="outlined"
              onClick={() => {
                // Corta la ubicación: lo que ya se ubicó se conserva y el resto queda para corregir a mano
                locating.current?.abort();
                setPhase('review');
              }}
            >
              {t('Detener y revisar')}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'review' ? (
        <Card aria-labelledby="review-title" className="flex flex-col gap-3">
          <CardTitle id="review-title">{t('Revisa las ubicaciones')}</CardTitle>
          <LocationReview
            rows={reviewRows}
            onChange={setReviewRows}
            onConfirm={() => void run(importableRows(reviewRows), [])}
            onRetry={locate}
          />
        </Card>
      ) : null}

      {phase === 'importing' ? (
        <Card aria-labelledby="progress-title" className="flex flex-col gap-3">
          <CardTitle id="progress-title">{t('Importando')}</CardTitle>
          {bar(percent, t('Progreso de la importación'))}
          <p role="status" aria-live="polite">
            {t('Importando… {0} de {1}', [progress.done, progress.total])}
          </p>
          <div>
            <Button
              variant="outlined"
              disabled={cancelling}
              onClick={() => {
                cancelled.current = true;
                setCancelling(true);
              }}
            >
              {cancelling ? t('Cancelando…') : t('Cancelar importación')}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'done' ? (
        <Card aria-labelledby="result-title" className="flex flex-col gap-3">
          <CardTitle id="result-title">{t('Resultado')}</CardTitle>
          <p role="status" aria-live="polite" className="font-medium">
            {t('Importación terminada: {0} creados, {1} ya existían, {2} fallidos y {3} sin procesar.', [
              counts.created,
              counts.existed,
              counts.failed,
              counts.skipped,
            ])}
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                [t('Creados'), counts.created],
                [t('Ya existían'), counts.existed],
                [t('Fallidos'), counts.failed],
                [t('Sin procesar'), counts.skipped],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-control bg-surface-container p-3">
                <dt className="text-sm text-on-surface-variant">{label}</dt>
                <dd className="font-brand text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          {failedRows.length > 0 ? (
            <SimpleTable caption={t('Filas que fallaron')} head={[t('Línea'), t('Dirección'), t('Motivo')]}>
              {failedRows.map((item) => (
                <tr key={item.row.line} className="border-b border-outline-variant last:border-b-0">
                  <td className={TD}>{item.row.line}</td>
                  <td className={TD}>{item.row.input.address}</td>
                  <td className={TD}>{item.message}</td>
                </tr>
              ))}
            </SimpleTable>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {counts.created > 0 || counts.existed > 0 ? (
              <Link href="/packages" className={buttonVariants({ variant: 'primary' })}>
                {t('Ver los paquetes')}
              </Link>
            ) : null}
            {failedRows.length > 0 ? (
              <Button
                variant="outlined"
                onClick={() =>
                  void run(
                    failedRows.map((r) => r.row),
                    results.filter((r) => r.status !== 'failed')
                  )
                }
              >
                {t('Reintentar las fallidas')}
              </Button>
            ) : null}
            {reportEntries.length > 0 ? (
              <Button
                variant="outlined"
                onClick={() => downloadCsv(ERRORS_FILE_NAME, importErrorsCsv(reportEntries, t))}
              >
                {t('Descargar informe de errores')}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
