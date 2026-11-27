'use client';

import { useState } from 'react';

import { useNotify } from '@/components/ui/toast';
import { ApiError, type FailureMessages } from '@/lib/api-client';
import { useT } from '@/lib/i18n/client';

import { useConfirm } from './use-confirm';

/** Peticiones a la vez al borrar un lote: el gateway no tiene lote para estos recursos, así que cada registro es una petición. */
export const BULK_CONCURRENCY = 4;

export interface BulkOutcome {
  done: number;
  failed: { label: string; message: string }[];
}

/** Hace `operation` por cada elemento, de a `BULK_CONCURRENCY`. Un fallo no detiene a los demás; un 404 cuenta como hecho. */
export async function runBulk<T>(
  items: readonly T[],
  label: (item: T) => string,
  operation: (item: T) => Promise<unknown>,
  fallback: string
): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: 0, failed: [] };
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        await operation(item);
        outcome.done++;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) outcome.done++;
        else outcome.failed.push({ label: label(item), message: err instanceof Error ? err.message : fallback });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, items.length) }, worker));
  return outcome;
}

export interface DeleteOptions<T> {
  /** «vehículo» / «vehículos»: el tipo de registro en minúscula. */
  singular: string;
  plural: string;
  /** Nombre de cada fila en los mensajes. */
  label: (row: T) => string;
  remove: (row: T, messages?: FailureMessages) => Promise<unknown>;
  reload: () => void;
  /** Texto por estado HTTP (p. ej. 409: el registro está en uso). */
  byStatus?: FailureMessages;
}

/**
 * Borrar con confirmación: pide, ejecuta, avisa y vuelve a cargar. El aviso de éxito es un toast; el fallo (p. ej. el vehículo está en
 * uso) queda en `error` para pintarlo sobre la tabla. `many` borra un lote con UNA confirmación y cuenta lo que pasó.
 */
export function useDelete<T>(options: DeleteOptions<T>) {
  const t = useT();
  const notify = useNotify();
  const { ask, dialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const { singular, plural } = options;
  const fallback = t('No se pudo completar la solicitud');

  async function many(rows: readonly T[], clear?: () => void) {
    setError(null);
    const one = rows.length === 1;
    const confirmed = await ask({
      title: t('Eliminar {0}', [one ? singular : plural]),
      message: one
        ? t('¿Eliminar {0} «{1}»? Esta acción no se puede deshacer.', [singular, options.label(rows[0])])
        : t('¿Eliminar los {0} {1} elegidos? Esta acción no se puede deshacer.', [rows.length, plural]),
      confirmLabel: t('Eliminar'),
      danger: true,
    });
    if (!confirmed) return;
    const result = await runBulk(rows, options.label, (row) => options.remove(row, options.byStatus), fallback);
    const total = result.done + result.failed.length;
    if (result.done > 0) {
      notify(
        result.failed.length > 0
          ? t('Se eliminaron {0} de {1} {2}', [result.done, total, plural])
          : result.done === 1
            ? t('Se eliminó 1 {0}', [singular])
            : t('Se eliminaron {0} {1}', [result.done, plural])
      );
    }
    if (result.failed.length > 0) {
      setError(
        t('No se pudo eliminar {0}: {1}', [
          result.failed.length === 1 ? `1 ${singular}` : `${result.failed.length} ${plural}`,
          result.failed.map((f) => `«${f.label}» (${f.message})`).join('; '),
        ])
      );
    }
    clear?.();
    options.reload();
  }

  return { many, one: (row: T) => many([row]), error, clearError: () => setError(null), dialog };
}
