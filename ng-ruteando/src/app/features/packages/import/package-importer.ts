import { PackageInput } from '../../../core/api/models';

import { ImportRow } from './package-rows';

export type RowStatus = 'created' | 'existed' | 'failed' | 'skipped';

export interface RowResult {
  row: ImportRow;
  status: RowStatus;
  /** Motivo del fallo (`failed`) o de que no se procesara (`skipped`). */
  message?: string;
}

export interface ImportOptions {
  /** Peticiones simultáneas como máximo (4 por defecto). */
  concurrency?: number;
  /** Intentos por fila ante saturación (3 por defecto). */
  maxAttempts?: number;
  /** Espera inicial ante saturación, que se duplica en cada intento (1000 ms por defecto). */
  baseDelayMs?: number;
  /** Se consulta antes de lanzar cada fila: con `true` no se lanzan más. */
  isCancelled?: () => boolean;
  onProgress?: (progress: { done: number; total: number }) => void;
  onResult?: (result: RowResult) => void;
  /** Espera; se sustituye en las pruebas. */
  sleep?: (ms: number) => Promise<void>;
}

export const DEFAULT_CONCURRENCY = 4;
export const MAX_ATTEMPTS = 3;
export const SATURATED = [429, 503];

const statusOf = (error: unknown): number | null =>
  typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : null;

const messageOf = (error: unknown): string => (error instanceof Error && error.message ? error.message : 'No se pudo completar la solicitud');

/**
 * Crea los paquetes de las filas con una concurrencia acotada. Una guía repetida (409) cuenta como
 * «ya existía»; 429 y 503 se reintentan con espera creciente y bajan la concurrencia a la mitad; cualquier
 * otro error deja la fila como fallida sin detener las demás. Al cancelar no se lanzan filas nuevas, las
 * que están en vuelo terminan y el resto queda como «sin procesar». Devuelve los resultados en el orden de entrada.
 */
export function runImport(rows: readonly ImportRow[], create: (input: PackageInput) => Promise<unknown>, options: ImportOptions = {}): Promise<RowResult[]> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const baseDelay = options.baseDelayMs ?? 1000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const isCancelled = options.isCancelled ?? (() => false);
  let limit = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);

  const results = new Array<RowResult | undefined>(rows.length);
  const queue = rows.map((row, index) => ({ row, index }));
  let active = 0;
  let done = 0;

  const record = (index: number, result: RowResult): void => {
    results[index] = result;
    done++;
    options.onResult?.(result);
    options.onProgress?.({ done, total: rows.length });
  };

  const attempt = async (row: ImportRow): Promise<RowResult> => {
    for (let n = 1; ; n++) {
      try {
        await create(row.input);
        return { row, status: 'created' };
      } catch (error) {
        const status = statusOf(error);
        if (status === 409 && row.input.guideNumber) {
          return { row, status: 'existed' };
        }
        if (status !== null && SATURATED.includes(status) && n < maxAttempts) {
          limit = Math.max(1, Math.floor(limit / 2));
          await sleep(baseDelay * 2 ** (n - 1));
          continue;
        }
        return { row, status: 'failed', message: messageOf(error) };
      }
    }
  };

  return new Promise<RowResult[]>((resolve) => {
    const finish = (): void => {
      queue.splice(0).forEach(({ row, index }) => {
        results[index] = { row, status: 'skipped', message: 'La importación se canceló antes de procesar esta fila' };
      });
      resolve(results as RowResult[]);
    };
    const pump = (): void => {
      while (!isCancelled() && active < limit && queue.length > 0) {
        const { row, index } = queue.shift()!;
        active++;
        void attempt(row).then((result) => {
          active--;
          record(index, result);
          pump();
        });
      }
      if (active === 0 && (queue.length === 0 || isCancelled())) {
        finish();
      }
    };
    if (rows.length === 0) {
      resolve([]);
      return;
    }
    pump();
  });
}
