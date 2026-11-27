'use client';

import { useCallback, useEffect, useState } from 'react';

import { useT } from '@/lib/i18n/client';

import { fetchAllPages, type Page } from './fetch-all';

export type ListStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface FullList<T> {
  status: ListStatus;
  rows: readonly T[];
  /** Lo que informa el gateway; mayor que `rows.length` si se alcanzó el tope de la carga entera. */
  total: number;
  error: string | null;
  reload: () => void;
}

/**
 * Listado con todos los registros en el cliente (ver `fetchAllPages`). Carga al montar y cada vez que cambia `fetchPage`
 * (que debe ser estable: defínelo fuera del componente o con `useCallback`); `reload` vuelve a pedirlo, y una respuesta vieja nunca pisa
 * a una más reciente.
 */
export function useFullList<T>(fetchPage: (page: number, size: number) => Promise<Page<T>>): FullList<T> {
  const t = useT();
  const [state, setState] = useState<Omit<FullList<T>, 'reload'>>({
    status: 'loading',
    rows: [],
    total: 0,
    error: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true; // una respuesta vieja nunca pisa a una más reciente
    fetchAllPages(fetchPage).then(
      ({ rows, total }) => {
        if (current)
          setState({ status: total === 0 && rows.length === 0 ? 'empty' : 'ready', rows, total, error: null });
      },
      (err: unknown) => {
        if (current) {
          setState({
            status: 'error',
            rows: [],
            total: 0,
            error: err instanceof Error ? err.message : t('No se pudo completar la solicitud'),
          });
        }
      }
    );
    return () => {
      current = false;
    };
  }, [fetchPage, version, t]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    setVersion((v) => v + 1);
  }, []);

  return { ...state, reload };
}
