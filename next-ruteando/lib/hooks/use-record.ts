'use client';

import { useEffect, useState } from 'react';

import { useT } from '@/lib/i18n/client';

export type RecordState<T> =
  | { status: 'new' }
  | { status: 'loading' }
  | { status: 'ready'; record: T }
  | { status: 'error'; error: string; missing: boolean };

/**
 * Trae el registro que edita un formulario (`id === null` es un alta: no hay nada que traer). `fetcher` debe ser estable; una respuesta
 * vieja nunca pisa a una más reciente, y un 404 se distingue de un fallo (`missing`).
 */
export function useRecord<T>(id: string | null, fetcher: (id: string) => Promise<T>): RecordState<T> {
  const t = useT();
  const [state, setState] = useState<RecordState<T>>(id === null ? { status: 'new' } : { status: 'loading' });
  useEffect(() => {
    if (id === null) return;
    let current = true;
    fetcher(id).then(
      (record) => {
        if (current) setState({ status: 'ready', record });
      },
      (err: unknown) => {
        if (!current) return;
        const status = (err as { status?: number }).status;
        setState({
          status: 'error',
          missing: status === 404,
          error: err instanceof Error ? err.message : t('No se pudo completar la solicitud'),
        });
      }
    );
    return () => {
      current = false;
    };
  }, [id, fetcher, t]);
  return state;
}
