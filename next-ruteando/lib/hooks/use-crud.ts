'use client';

import { useMemo } from 'react';

import { crud } from '@/lib/api/crud';
import { useT } from '@/lib/i18n/client';

/** El cliente de un recurso del gateway ya ligado al idioma activo (los mensajes de error salen traducidos). Estable mientras no cambie el idioma. */
export function useCrud<T, I>(resource: string) {
  const t = useT();
  return useMemo(() => crud<T, I>(resource, t), [resource, t]);
}
